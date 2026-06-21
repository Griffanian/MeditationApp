import logging
import re

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

import time
from collections import defaultdict


def _validate_password(password):
    """Return an error string if the password is too weak, else None."""
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter"
    if not re.search(r"[0-9]", password):
        return "Password must contain at least one number"
    return None

from ..authentication import make_token
from ..models import InviteLink, UserProfile, ViewerAccess
from ..permissions import get_role
from ..services import storage

# Simple in-memory rate limiter for login/signup
_attempts = defaultdict(list)  # ip -> [timestamps]
RATE_LIMIT_WINDOW = 300  # 5 minutes
RATE_LIMIT_MAX = 10  # max attempts per window


def _get_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    return xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR", "")


def _check_rate_limit(request):
    ip = _get_ip(request)
    now = time.time()
    # Clean old entries
    _attempts[ip] = [t for t in _attempts[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(_attempts[ip]) >= RATE_LIMIT_MAX:
        return False
    _attempts[ip].append(now)
    return True


def _handle_photo_upload(user, profile, files):
    """Upload profile photo from request.FILES and save path to profile."""
    if "photo" not in files:
        return
    f = files["photo"]
    ext = f.name.rsplit(".", 1)[-1].lower() if "." in f.name else "jpg"
    if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
        ext = "jpg"
    path = storage.profile_photo_path(user.pk, ext)
    storage.upload_file(path, f.read(), content_type=f.content_type)
    profile.profile_photo = path
    profile.save(update_fields=["profile_photo"])


def _profile_photo_url(profile):
    if profile.profile_photo:
        return storage.file_url(profile.profile_photo)
    return ""


class VerifyPasswordView(APIView):
    def post(self, request):
        password = request.data.get("password", "")
        if not password:
            return Response({"error": "Password is required"}, status=400)
        if not request.user.check_password(password):
            return Response({"error": "Incorrect password"}, status=400)
        return Response({"ok": True})


class ProfileView(APIView):
    def get(self, request):
        user = request.user
        profile = user.profile
        return Response({
            "username": user.username,
            "display_name": profile.display_name or user.username,
            "role": profile.role,
            "show_public_to_viewers": profile.show_public_to_viewers,
            "profile_photo": _profile_photo_url(profile),
        })

    def put(self, request):
        user = request.user
        profile = user.profile
        display_name = request.data.get("display_name", "").strip()
        new_username = request.data.get("username", "").strip()
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")

        # Update display name
        if display_name:
            profile.display_name = display_name
            profile.save(update_fields=["display_name"])

        # Update show_public_to_viewers
        if "show_public_to_viewers" in request.data:
            profile.show_public_to_viewers = bool(request.data["show_public_to_viewers"])
            profile.save(update_fields=["show_public_to_viewers"])

        # Update username
        if new_username and new_username != user.username:
            from django.db import IntegrityError
            try:
                user.username = new_username
                user.save(update_fields=["username"])
            except IntegrityError:
                return Response({"error": "Username already taken"}, status=400)

        # Change password
        if new_password:
            if not current_password:
                return Response({"error": "Current password required"}, status=400)
            if not user.check_password(current_password):
                return Response({"error": "Current password is incorrect"}, status=400)
            pw_error = _validate_password(new_password)
            if pw_error:
                return Response({"error": pw_error}, status=400)
            user.set_password(new_password)
            user.save()

        # Handle photo upload
        _handle_photo_upload(user, profile, request.FILES)

        return Response({"ok": True, "username": user.username, "profile_photo": _profile_photo_url(profile)})

    def delete(self, request):
        user = request.user
        if user.is_staff:
            return Response({"error": "Admin accounts cannot be deleted this way"}, status=400)
        user.delete()
        return Response({"ok": True})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not _check_rate_limit(request):
            return Response({"error": "Too many attempts. Try again in a few minutes."}, status=429)
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            token = make_token(user)
            display_name = ""
            show_public = True
            has_programmes = True
            try:
                display_name = user.profile.display_name
                if user.profile.role == "viewer":
                    show_public = ViewerAccess.objects.filter(
                        viewer=user, show_public=True,
                    ).exists()
                    from ..permissions import visible_qs
                    from ..models import Practice
                    has_programmes = visible_qs(Practice.objects.all(), user).exists()
            except Exception:
                pass
            profile_photo = ""
            try:
                profile_photo = _profile_photo_url(user.profile)
            except Exception:
                pass
            return Response({
                "ok": True,
                "token": token,
                "role": get_role(user),
                "is_admin": user.is_staff,
                "username": user.username,
                "display_name": display_name or user.username,
                "show_public": show_public,
                "has_programmes": has_programmes,
                "profile_photo": profile_photo,
            })
        return Response({"error": "Invalid credentials"}, status=401)


class LogoutView(APIView):
    def post(self, request):
        return Response({"ok": True})


class AuthStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user and request.user.is_authenticated:
            display_name = ""
            show_public = True
            try:
                display_name = request.user.profile.display_name
                # For viewers: check if any linked builder allows public for them
                if request.user.profile.role == "viewer":
                    show_public = ViewerAccess.objects.filter(
                        viewer=request.user,
                        show_public=True,
                    ).exists()
            except Exception:
                pass
            has_programmes = True
            if get_role(request.user) == "viewer":
                from ..permissions import visible_qs
                from ..models import Practice
                has_programmes = visible_qs(Practice.objects.all(), request.user).exists()

            profile_photo = ""
            try:
                profile_photo = _profile_photo_url(request.user.profile)
            except Exception:
                pass

            return Response({
                "authenticated": True,
                "username": request.user.username,
                "display_name": display_name or request.user.username,
                "role": get_role(request.user),
                "is_admin": request.user.is_staff,
                "show_public": show_public,
                "has_programmes": has_programmes,
                "profile_photo": profile_photo,
            })
        return Response({"authenticated": False})


class SignupView(APIView):
    permission_classes = [AllowAny]

    @staticmethod
    def _make_username(name):
        """Derive a unique username from a display name."""
        import re
        base = name.lower().strip().replace(" ", "-")
        base = re.sub(r"[^a-z0-9-]", "", base) or "user"
        # Find a unique username
        if not User.objects.filter(username=base).exists():
            return base
        n = 2
        while User.objects.filter(username=f"{base}-{n}").exists():
            n += 1
        return f"{base}-{n}"

    def post(self, request):
        if not _check_rate_limit(request):
            return Response({"error": "Too many attempts. Try again in a few minutes."}, status=429)
        token_str = request.data.get("token", "")
        password = request.data.get("password", "")

        if not password:
            return Response({"error": "Password is required"}, status=400)
        pw_error = _validate_password(password)
        if pw_error:
            return Response({"error": pw_error}, status=400)

        # Validate invite
        try:
            invite = InviteLink.objects.select_related("created_by").get(
                token=token_str, is_active=True
            )
        except InviteLink.DoesNotExist:
            return Response({"error": "Invalid or expired invite"}, status=400)

        if invite.used_by is not None:
            return Response({"error": "Invite already used"}, status=400)
        if invite.expires_at < timezone.now():
            return Response({"error": "Invite has expired"}, status=400)

        # Derive username from invite name
        username = self._make_username(invite.name or "user")

        try:
            with transaction.atomic():
                user = User.objects.create_user(username=username, password=password)

                profile = UserProfile.objects.create(
                    user=user, role=invite.role,
                    display_name=invite.name,
                    invited_by=invite.created_by,
                )

                # If viewer invite, create ViewerAccess linking to the builder who invited them
                if invite.role == "viewer":
                    ViewerAccess.objects.create(viewer=user, builder=invite.created_by)

                # Mark invite as used
                invite.used_by = user
                invite.used_at = timezone.now()
                invite.is_active = False
                invite.save()
        except Exception:
            logger.exception("Signup failed for invite %s", invite.token[:8])
            return Response({"error": "Signup failed, please try again"}, status=500)

        # Return auth token so they're logged in immediately
        auth_token = make_token(user)
        show_public = True
        if invite.role == "viewer":
            show_public = ViewerAccess.objects.filter(
                viewer=user, show_public=True,
            ).exists()
        return Response({
            "ok": True,
            "token": auth_token,
            "role": invite.role,
            "username": user.username,
            "display_name": invite.name or user.username,
            "is_admin": False,
            "show_public": show_public,
            "has_programmes": False,
            "profile_photo": _profile_photo_url(profile),
        })


class JoinValidateView(APIView):
    """Public endpoint: validate a permanent signup link."""
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            profile = UserProfile.objects.select_related("user").get(signup_token=token)
        except UserProfile.DoesNotExist:
            return Response({"valid": False})

        if not profile.user.is_active:
            return Response({"valid": False})

        # Admin's link → creates builders; builder/editor's link → creates viewers
        if profile.role == "admin":
            signup_role = "builder"
        elif profile.role in ("builder", "editor"):
            signup_role = "viewer"
        else:
            return Response({"valid": False})

        return Response({
            "valid": True,
            "role": signup_role,
            "owner_name": profile.name,
        })


class JoinSignupView(APIView):
    """Public endpoint: create an account via a permanent signup link."""
    permission_classes = [AllowAny]

    def post(self, request):
        if not _check_rate_limit(request):
            return Response({"error": "Too many attempts. Try again in a few minutes."}, status=429)

        token_str = request.data.get("token", "")
        display_name = request.data.get("display_name", "").strip()
        password = request.data.get("password", "")

        if not display_name:
            return Response({"error": "Display name is required"}, status=400)
        if not password:
            return Response({"error": "Password is required"}, status=400)

        pw_error = _validate_password(password)
        if pw_error:
            return Response({"error": pw_error}, status=400)

        import uuid
        username = f"u-{uuid.uuid4().hex[:12]}"

        # Look up the signup token owner
        try:
            owner_profile = UserProfile.objects.select_related("user").get(signup_token=token_str)
        except UserProfile.DoesNotExist:
            return Response({"error": "Invalid signup link"}, status=400)

        if not owner_profile.user.is_active:
            return Response({"error": "Invalid signup link"}, status=400)

        owner = owner_profile.user

        # Determine role
        if owner_profile.role == "admin":
            new_role = "builder"
        elif owner_profile.role in ("builder", "editor"):
            new_role = "viewer"
        else:
            return Response({"error": "Invalid signup link"}, status=400)

        try:
            with transaction.atomic():
                user = User.objects.create_user(username=username, password=password)

                profile = UserProfile.objects.create(
                    user=user, role=new_role,
                    display_name=display_name,
                    invited_by=owner,
                )

                if new_role == "viewer":
                    ViewerAccess.objects.create(viewer=user, builder=owner)

        except IntegrityError:
            return Response({"error": "Signup failed, please try again"}, status=400)
        except Exception:
            logger.exception("Join signup failed for token %s", token_str[:8])
            return Response({"error": "Signup failed, please try again"}, status=500)

        auth_token = make_token(user)
        show_public = True
        if new_role == "viewer":
            show_public = ViewerAccess.objects.filter(
                viewer=user, show_public=True,
            ).exists()
        return Response({
            "ok": True,
            "token": auth_token,
            "role": new_role,
            "username": user.username,
            "display_name": display_name,
            "is_admin": False,
            "show_public": show_public,
            "has_programmes": False,
            "profile_photo": "",
        })


class MySignupLinkView(APIView):
    """Authenticated endpoint: get or generate your permanent signup link."""

    def get(self, request):
        profile = request.user.profile
        if profile.role not in ("admin", "builder", "editor"):
            return Response({"error": "Not available for your role"}, status=403)
        token = profile.get_signup_token()
        target_role = "builder" if profile.role == "admin" else "viewer"
        return Response({
            "token": token,
            "target_role": target_role,
        })
