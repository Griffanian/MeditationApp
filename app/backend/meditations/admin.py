from django.contrib import admin

from .models import (
    Asset, AssembledOutput, GeneratedVoiceClip, InviteLink, Meditation,
    SpeechSegmentAudio, Stage, UserProfile, UserUploadedClip,
    VariableRecording, ViewerAccess, Voice,
)

admin.site.register(Meditation)
admin.site.register(Stage)
admin.site.register(Voice)
admin.site.register(GeneratedVoiceClip)
admin.site.register(UserUploadedClip)
admin.site.register(SpeechSegmentAudio)
admin.site.register(VariableRecording)
admin.site.register(Asset)
admin.site.register(AssembledOutput)
admin.site.register(UserProfile)
admin.site.register(InviteLink)
admin.site.register(ViewerAccess)
