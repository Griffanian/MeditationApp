from django.contrib import admin

from .models import (
    Asset, AssembledOutput, Component, InviteLink, Meditation,
    Stage, UserProfile, ViewerAccess,
)

admin.site.register(Meditation)
admin.site.register(Stage)
admin.site.register(Component)
admin.site.register(Asset)
admin.site.register(AssembledOutput)
admin.site.register(UserProfile)
admin.site.register(InviteLink)
admin.site.register(ViewerAccess)
