import logging
import os

from django.conf import settings
from django.core.mail import send_mail
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Feedback
from ..permissions import IsAdmin

log = logging.getLogger(__name__)

POSTHOG_PROJECT_ID = os.getenv("POSTHOG_PROJECT_ID", "")
POSTHOG_HOST = os.getenv("POSTHOG_HOST", "https://eu.posthog.com")


def _replay_url(session_id):
    if not session_id or not POSTHOG_PROJECT_ID:
        return ""
    return f"{POSTHOG_HOST}/project/{POSTHOG_PROJECT_ID}/replay/{session_id}"


class FeedbackView(APIView):
    """POST: any authenticated user can submit feedback.
    GET: admin-only list of all feedback."""

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"error": "Message is required"}, status=400)

        session_id = (request.data.get("session_id") or "").strip()

        fb = Feedback.objects.create(
            user=request.user,
            message=message,
            page=request.data.get("page", ""),
            session_id=session_id,
        )

        # Send email notification
        notify = getattr(settings, "FEEDBACK_NOTIFY_EMAIL", "")
        if notify:
            profile = getattr(request.user, "profile", None)
            display = profile.name if profile else request.user.username
            subject = f"New feedback from {display}"
            replay = _replay_url(session_id)
            body = (
                f"From: {display} ({request.user.username})\n"
                f"Page: {fb.page or '(none)'}\n"
            )
            if replay:
                body += f"Session replay: {replay}\n"
            body += f"\n{fb.message}"
            try:
                send_mail(
                    subject,
                    body,
                    settings.DEFAULT_FROM_EMAIL,
                    [notify],
                    fail_silently=False,
                )
            except Exception:
                log.exception("Failed to send feedback notification email")

        return Response({"status": "ok", "id": str(fb.id)}, status=201)

    def get(self, request):
        if not IsAdmin().has_permission(request, self):
            return Response({"error": "Admin only"}, status=403)

        items = Feedback.objects.select_related("user__profile").all()[:100]
        return Response([
            {
                "id": str(f.id),
                "user": f.user.username,
                "display_name": f.user.profile.name if hasattr(f.user, "profile") else f.user.username,
                "message": f.message,
                "page": f.page,
                "created_at": f.created_at.isoformat(),
            }
            for f in items
        ])
