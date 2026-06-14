from django.contrib.auth import authenticate
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ..authentication import make_token


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            token = make_token(user)
            return Response({
                "ok": True,
                "token": token,
                "is_admin": user.is_staff,
                "username": user.username,
            })
        return Response({"error": "Invalid credentials"}, status=401)


class LogoutView(APIView):
    def post(self, request):
        return Response({"ok": True})


class AuthStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user and request.user.is_authenticated:
            return Response({
                "authenticated": True,
                "username": request.user.username,
                "is_admin": request.user.is_staff,
            })
        return Response({"authenticated": False})
