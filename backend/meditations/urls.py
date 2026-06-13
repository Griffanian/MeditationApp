from django.urls import path

from .views import assembly, assets, components, meditations, scripts, stages, trim

urlpatterns = [
    # Meditation list & metadata
    path("api/meditations", meditations.MeditationListView.as_view()),
    path("api/meditations/<str:name>/meta", meditations.MetaView.as_view()),
    path("api/meditations/<str:name>/instructions", meditations.InstructionsView.as_view()),
    path("api/meditations/<str:name>/instructions-pdf", meditations.InstructionsPdfView.as_view()),
    path("api/meditations/<str:name>/loops", meditations.LoopsView.as_view()),

    # Root-level script
    path("api/meditations/<str:name>/script", scripts.RootScriptView.as_view()),

    # Root-level components
    path("api/meditations/<str:name>/components", components.RootComponentListView.as_view()),
    path("api/meditations/<str:name>/timestamps/<str:seg_id>", components.RootTimestampsView.as_view()),
    path("api/meditations/<str:name>/generate-audio/<str:seg_id>", components.RootGenerateAudioView.as_view()),
    path("api/meditations/<str:name>/upload-component/<str:seg_id>", components.RootUploadComponentView.as_view()),

    # Root-level assembly
    path("api/meditations/<str:name>/assemble", assembly.RootAssembleView.as_view()),

    # Root-level trim
    path("api/meditations/<str:name>/trim-meta/<str:seg_id>", trim.RootTrimMetaView.as_view()),
    path("api/meditations/<str:name>/trim-component/<str:seg_id>", trim.RootTrimComponentView.as_view()),

    # Stage script & variables
    path("api/meditations/<str:name>/stages/<str:stage_id>/script", scripts.StageScriptView.as_view()),
    path("api/meditations/<str:name>/stages/<str:stage_id>/variables", stages.VariablesView.as_view()),

    # Stage components
    path("api/meditations/<str:name>/stages/<str:stage_id>/components", components.StageComponentListView.as_view()),
    path("api/meditations/<str:name>/stages/<str:stage_id>/timestamps/<str:seg_id>", components.StageTimestampsView.as_view()),
    path("api/meditations/<str:name>/stages/<str:stage_id>/generate-audio/<str:seg_id>", components.StageGenerateAudioView.as_view()),
    path("api/meditations/<str:name>/stages/<str:stage_id>/upload-component/<str:seg_id>", components.StageUploadComponentView.as_view()),
    path("api/meditations/<str:name>/stages/<str:stage_id>/delete-component/<str:seg_id>", components.StageDeleteComponentView.as_view()),

    # Stage assembly
    path("api/meditations/<str:name>/stages/<str:stage_id>/assemble", assembly.StageAssembleView.as_view()),

    # Stage trim
    path("api/meditations/<str:name>/stages/<str:stage_id>/trim-meta/<str:seg_id>", trim.StageTrimMetaView.as_view()),

    # Assets
    path("api/upload-asset/<str:filename>", assets.UploadAssetView.as_view()),
    path("api/trim-meta/asset/<str:filename>", trim.AssetTrimMetaView.as_view()),
    path("api/trim-asset/<str:filename>", trim.TrimAssetView.as_view()),

    # Audio & PDF serving — redirect to Supabase Storage public URLs
    path("audio/meditation/<str:name>/component/<str:filename>", components.serve_component),
    path("audio/meditation/<str:name>/output/<str:filename>", components.serve_output),
    path("audio/meditation/<str:name>/stage/<str:stage_id>/component/<str:filename>", components.serve_stage_component),
    path("audio/meditation/<str:name>/stage/<str:stage_id>/output/<str:filename>", components.serve_stage_output),
    path("audio/asset/<str:filename>", components.serve_asset),
    path("pdf/meditation/<str:name>/instructions.pdf", components.serve_pdf),
]
