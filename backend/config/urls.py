from django.contrib import admin
from django.urls import include, path, re_path

from .spa import spa_view

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("meditations.urls")),
    # SPA catch-all: serve frontend assets or index.html for any unmatched path
    re_path(r"^(?!api/|audio/|pdf/|admin/).*$", spa_view, name="spa"),
]
