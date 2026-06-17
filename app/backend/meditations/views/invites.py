from datetime import timedelta

from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import InviteLink
from ..permissions import IsAdmin, IsContentCreator, get_role


def _serialize_invite(inv):
    return {
        "id": str(inv.id),
        "token": inv.token,
        "name": inv.name,
        "role": inv.role,
        "created_by": inv.created_by.username if inv.created_by_id else "",
        "used_by": inv.used_by.username if inv.used_by else None,
        "used_at": inv.used_at.isoformat() if inv.used_at else None,
        "expires_at": inv.expires_at.isoformat(),
        "is_active": inv.is_active and inv.used_by is None and inv.expires_at > timezone.now(),
        "created_at": inv.created_at.isoformat(),
    }


class InviteListView(APIView):
    permission_classes = [IsContentCreator]

    def get(self, request):
        """List invites. Admins see all; builders see their own."""
        role = get_role(request.user)
        qs = InviteLink.objects.select_related("created_by", "used_by")
        if role != "admin":
            qs = qs.filter(created_by=request.user)
        qs = qs.order_by("-created_at")
        return Response([_serialize_invite(inv) for inv in qs])

    def post(self, request):
        """Create invite. Admins can create builder invites; builders can only create viewer invites."""
        role = get_role(request.user)
        invite_role = request.data.get("role", "viewer")

        if invite_role == "builder" and role != "admin":
            return Response({"error": "Only admins can create builder invites"}, status=403)
        if invite_role not in ("builder", "viewer"):
            return Response({"error": "Invalid role"}, status=400)
        if role == "builder" and invite_role != "viewer":
            return Response({"error": "Builders can only create viewer invites"}, status=403)

        name = (request.data.get("name") or "").strip()
        days = int(request.data.get("expires_days", 7))
        days = max(1, min(days, 90))

        invite = InviteLink(
            created_by=request.user,
            role=invite_role,
            name=name,
            expires_at=timezone.now() + timedelta(days=days),
        )
        invite.save()

        return Response(_serialize_invite(invite), status=201)


class InviteDetailView(APIView):
    permission_classes = [IsContentCreator]

    def delete(self, request, invite_id):
        """Deactivate an invite. Owner or admin."""
        try:
            invite = InviteLink.objects.get(id=invite_id)
        except InviteLink.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        role = get_role(request.user)
        if role != "admin" and invite.created_by != request.user:
            return Response({"error": "Forbidden"}, status=403)

        invite.is_active = False
        invite.save()
        return Response({"ok": True})


class InviteValidateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        """Check if an invite token is valid (for signup page)."""
        try:
            invite = InviteLink.objects.get(token=token)
        except InviteLink.DoesNotExist:
            return Response({"valid": False})

        valid = (
            invite.is_active
            and invite.used_by is None
            and invite.expires_at > timezone.now()
        )
        return Response({
            "valid": valid,
            "role": invite.role if valid else None,
            "name": invite.name if valid else None,
        })
