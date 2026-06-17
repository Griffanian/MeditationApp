from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Asset
from ..permissions import IsAdminOrEditor
from ..services import storage


class UploadAssetView(APIView):
    permission_classes = [IsAdminOrEditor]
    def post(self, request, filename):
        if "file" not in request.FILES:
            return Response({"error": "no file"}, status=400)
        f = request.FILES["file"]
        file_path = storage.asset_path(filename)
        storage.upload_file(file_path, f.read(), content_type="audio/mpeg")

        asset, _ = Asset.objects.get_or_create(
            filename=filename,
            defaults={"audio_file": file_path},
        )
        if not asset.audio_file:
            asset.audio_file = file_path
            asset.save()

        return Response({"status": "ok"})
