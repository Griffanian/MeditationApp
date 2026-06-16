import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpResponseNotFound

# Look for the frontend build in the project root
_FRONTEND_DIR = Path(settings.BASE_DIR).parent / "frontend" / "dist"


def spa_view(request):
    # First check if the request matches a static file in dist/
    rel_path = request.path.lstrip("/")
    if rel_path:
        file_path = _FRONTEND_DIR / rel_path
        if file_path.is_file() and _FRONTEND_DIR in file_path.resolve().parents:
            content_type, _ = mimetypes.guess_type(str(file_path))
            return FileResponse(open(file_path, "rb"), content_type=content_type or "application/octet-stream")

    # Otherwise serve index.html for SPA routing
    index = _FRONTEND_DIR / "index.html"
    if index.exists():
        return FileResponse(open(index, "rb"), content_type="text/html")
    return HttpResponseNotFound("Frontend not built. Run: cd frontend && npm run build")
