"""Views for the agentic assistant — streaming chat + thread management."""

from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Thread
from ..permissions import get_role
from ..services.agent import run_agent_stream


class AgentChatView(APIView):
    """Streaming agentic chat endpoint. Returns SSE."""

    def post(self, request):
        message = request.data.get("message", "")
        thread_id = request.data.get("thread_id")
        context = request.data.get("context", {})

        if not message:
            return Response({"error": "message required"}, status=400)

        if thread_id:
            thread = get_object_or_404(
                Thread, id=thread_id, user=request.user
            )
        else:
            thread = Thread.objects.create(user=request.user)

        role = get_role(request.user)
        read_only = role not in ("admin", "editor", "builder")

        def event_stream():
            try:
                yield from run_agent_stream(thread, message, context, read_only=read_only)
            except Exception as e:
                import json
                yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"

        response = StreamingHttpResponse(
            event_stream(),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


class ThreadListView(APIView):
    """List user's conversation threads."""

    def get(self, request):
        threads = Thread.objects.filter(
            user=request.user, archived=False
        )
        return Response([
            {
                "id": str(t.id),
                "title": t.title or "New conversation",
                "created_at": t.created_at.isoformat(),
                "updated_at": t.updated_at.isoformat(),
            }
            for t in threads
        ])


class ThreadDetailView(APIView):
    """Get, update, or delete a thread."""

    def get(self, request, thread_id):
        thread = get_object_or_404(
            Thread, id=thread_id, user=request.user
        )
        messages = [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
            }
            for m in thread.messages.all()
        ]
        return Response({
            "id": str(thread.id),
            "title": thread.title,
            "messages": messages,
        })

    def patch(self, request, thread_id):
        thread = get_object_or_404(
            Thread, id=thread_id, user=request.user
        )
        if "title" in request.data:
            thread.title = request.data["title"]
        if "archived" in request.data:
            thread.archived = request.data["archived"]
        thread.save()
        return Response({"status": "ok"})

    def delete(self, request, thread_id):
        thread = get_object_or_404(
            Thread, id=thread_id, user=request.user
        )
        thread.delete()
        return Response({"status": "ok"})
