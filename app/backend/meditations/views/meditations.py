import hashlib
import json
import re
import uuid

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Category, Group, Meditation, Stage
from ..permissions import (
    CanEditContent, CanViewContent, IsAdmin, IsAdminOrEditor,
    IsAdminOrReadOnly, IsContentCreator, get_role, visible_qs,
)
from ..services import storage
from ..services.chat import chat
from ..services.extract_instructions import extract_instructions


def _check_meditation_perm(request, name, write=False):
    """Fetch meditation and check object-level permission. Returns (med, error_response)."""
    med = get_object_or_404(Meditation, name=name)
    perm = CanEditContent() if write else CanViewContent()
    if not perm.has_object_permission(request, None, med):
        return None, Response({"error": "Forbidden"}, status=403)
    return med, None


class MeditationListView(APIView):
    def get(self, request):
        qs = visible_qs(
            Meditation.objects.prefetch_related("stages").select_related("created_by__profile").order_by("name"),
            request.user,
        )
        meds = []
        for m in qs:
            stage_objs = {s.stage_id: s for s in m.stages.all()}
            instr_stages = (m.instructions or {}).get("stages", [])
            stages = []
            for s in instr_stages:
                stage_id = s.get("id")
                if not stage_id:
                    continue
                stage_obj = stage_objs.get(stage_id)
                variables = stage_obj.variables if stage_obj else {}
                stages.append({
                    "id": stage_id,
                    "name": s.get("name", ""),
                    "variables": variables or {},
                })
            meds.append({
                "name": m.name,
                "display_name": m.display_name or m.name.capitalize(),
                "category": m.category,
                "stages": stages,
                "created_by": m.created_by.username if m.created_by else None,
                "created_by_display": m.created_by.profile.name if m.created_by and hasattr(m.created_by, 'profile') else (m.created_by.username if m.created_by else None),
                "is_public": m.is_public,
            })
        return Response(meds)

    def post(self, request):
        if not IsContentCreator().has_permission(request, self):
            return Response({"error": "Forbidden"}, status=403)
        display_name = (request.data.get("display_name") or "").strip()
        category = (request.data.get("category") or "uncategorised").strip()
        if not display_name:
            return Response({"error": "display_name required"}, status=400)
        med_id = f"med-{uuid.uuid4().hex[:12]}"
        Meditation.objects.create(
            name=med_id, display_name=display_name, category=category,
            created_by=request.user,
            is_public=get_role(request.user) in ("admin", "editor"),
        )
        return Response({
            "name": med_id,
            "display_name": display_name,
            "category": category,
            "stages": [],
            "created_by": request.user.username,
            "is_public": get_role(request.user) in ("admin", "editor"),
        }, status=201)


class MetaView(APIView):
    def get(self, request, name):
        m, err = _check_meditation_perm(request, name)
        if err:
            return err
        return Response({
            "display_name": m.display_name,
            "category": m.category,
            "created_by": m.created_by.username if m.created_by else None,
            "is_public": m.is_public,
        })

    def put(self, request, name):
        m, err = _check_meditation_perm(request, name, write=True)
        if err:
            return err
        if "display_name" in request.data:
            m.display_name = request.data["display_name"]
        if "category" in request.data:
            m.category = request.data["category"]
        if "is_public" in request.data:
            m.is_public = request.data["is_public"]
        m.save()
        return Response({"status": "ok"})

    def delete(self, request, name):
        m, err = _check_meditation_perm(request, name, write=True)
        if err:
            return err
        m.delete()
        return Response({"status": "ok"})


def _serialize_category(cat):
    return {
        "name": cat.name,
        "display_name": cat.display_name,
        "sort_order": cat.sort_order,
        "group": cat.group_id or "",
        "group_display": cat.group.display_name if cat.group else "",
        "created_by": cat.created_by.username if cat.created_by else None,
        "is_public": cat.is_public,
    }


def _resolve_group(group_str):
    """Look up a Group by ID. Returns None for empty string."""
    if not group_str:
        return None
    return Group.objects.filter(name=group_str).first()


class GroupListView(APIView):
    def get(self, request):
        return Response([
            {
                "name": g.name, "display_name": g.display_name,
                "sort_order": g.sort_order,
                "created_by": g.created_by.username if g.created_by else None,
                "is_public": g.is_public,
            }
            for g in Group.objects.select_related("created_by").all()
        ])

    def post(self, request):
        if not IsContentCreator().has_permission(request, self):
            return Response({"error": "Forbidden"}, status=403)
        display_name = (request.data.get("display_name") or "").strip()
        if not display_name:
            return Response({"error": "display_name required"}, status=400)
        slug = f"group-{uuid.uuid4().hex[:8]}"
        group = Group.objects.create(
            name=slug, display_name=display_name,
            sort_order=50, created_by=request.user,
        )
        return Response({
            "name": group.name, "display_name": group.display_name,
            "sort_order": group.sort_order, "created_by": request.user.username,
            "is_public": group.is_public,
        }, status=201)


class GroupDetailView(APIView):
    permission_classes = [IsAdminOrEditor]

    def put(self, request, name):
        group = get_object_or_404(Group, name=name)
        if "display_name" in request.data:
            group.display_name = request.data["display_name"]
        if "sort_order" in request.data:
            group.sort_order = request.data["sort_order"]
        if "is_public" in request.data:
            group.is_public = request.data["is_public"]
        group.save()
        return Response({"name": group.name, "display_name": group.display_name})

    def delete(self, request, name):
        group = get_object_or_404(Group, name=name)
        group.categories.update(group=None)
        group.delete()
        return Response({"status": "ok"})


class CategoryListView(APIView):
    def get(self, request):
        return Response([
            _serialize_category(c)
            for c in Category.objects.select_related("group", "created_by__profile").all()
        ])

    def post(self, request):
        if not IsContentCreator().has_permission(request, self):
            return Response({"error": "Forbidden"}, status=403)
        display_name = (request.data.get("display_name") or "").strip()
        if not display_name:
            return Response({"error": "display_name required"}, status=400)
        cat_id = f"cat-{uuid.uuid4().hex[:12]}"
        group = _resolve_group((request.data.get("group") or "").strip())
        cat = Category.objects.create(
            name=cat_id, display_name=display_name, sort_order=50,
            group=group, created_by=request.user,
        )
        return Response(_serialize_category(cat), status=201)


class CategoryDetailView(APIView):
    permission_classes = [IsAdminOrEditor]

    def put(self, request, name):
        cat = get_object_or_404(Category, name=name)
        if "display_name" in request.data:
            cat.display_name = request.data["display_name"]
        if "sort_order" in request.data:
            cat.sort_order = request.data["sort_order"]
        if "group" in request.data:
            cat.group = _resolve_group(request.data["group"])
        if "is_public" in request.data:
            cat.is_public = request.data["is_public"]
        cat.save()
        return Response({"status": "ok"})

    def delete(self, request, name):
        cat = get_object_or_404(Category, name=name)
        Meditation.objects.filter(category=name).update(category="uncategorised")
        cat.delete()
        return Response({"status": "ok"})


class InstructionsView(APIView):
    def get(self, request, name):
        m, err = _check_meditation_perm(request, name)
        if err:
            return err
        instructions = m.instructions or {"description": "", "stages": []}
        return Response(instructions)

    def put(self, request, name):
        m, err = _check_meditation_perm(request, name, write=True)
        if err:
            return err
        m.instructions = request.data
        m.save()
        return Response({"status": "ok"})


class InstructionsPdfView(APIView):
    def get(self, request, name):
        _, err = _check_meditation_perm(request, name)
        if err:
            return err
        path = storage.pdf_path(name)
        return Response({"exists": storage.file_exists(path)})

    def post(self, request, name):
        _, err = _check_meditation_perm(request, name, write=True)
        if err:
            return err
        if "file" not in request.FILES:
            return Response({"error": "no file"}, status=400)
        f = request.FILES["file"]
        path = storage.pdf_path(name)
        storage.upload_file(path, f.read(), content_type="application/pdf")
        return Response({"status": "ok"})

    def delete(self, request, name):
        _, err = _check_meditation_perm(request, name, write=True)
        if err:
            return err
        path = storage.pdf_path(name)
        storage.delete_file(path)
        return Response({"status": "ok"})


class LoopsView(APIView):
    def put(self, request, name):
        m, err = _check_meditation_perm(request, name, write=True)
        if err:
            return err
        _apply_loops(m.script, request.data)
        m.save()
        return Response({"status": "ok"})


class ExtractInstructionsView(APIView):
    def post(self, request, name):
        _, err = _check_meditation_perm(request, name, write=True)
        if err:
            return err
        youtube_url = request.data.get("youtube_url")
        context = request.data.get("context")
        try:
            result = extract_instructions(name, youtube_url=youtube_url, context=context)
        except FileNotFoundError as e:
            return Response({"error": str(e)}, status=404)
        except json.JSONDecodeError as e:
            return Response({"error": f"AI returned invalid JSON: {e}"}, status=500)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
        return Response(result)


def _seg_key(seg):
    """Generate a stable key for a segment for diffing."""
    t = seg.get("type", "unknown")
    if t == "speech":
        return ("speech", seg.get("id", seg.get("text", "")[:60]))
    if t == "pause":
        return ("pause", str(seg.get("duration_seconds", 0)))
    if t == "asset":
        return ("asset", seg.get("file", ""))
    if t == "split_marker":
        return ("split_marker", str(seg.get("multiplier", 1)))
    if t == "loop":
        label = seg.get("label", "")
        variable = seg.get("variable", "")
        return ("loop", label or variable or "loop")
    return (t, "")


def _seg_desc(seg):
    """Human-readable description of a segment."""
    t = seg.get("type", "unknown")
    if t == "speech":
        text = seg.get("text", "")
        preview = text[:50] + "\u2026" if len(text) > 50 else text
        return f'"{preview}"'
    if t == "pause":
        return f'{seg.get("duration_seconds", 0)}s pause'
    if t == "asset":
        return seg.get("file", "audio file")
    if t == "split_marker":
        m = seg.get("multiplier", 1)
        return "split marker" + (f" (\u00d7{m})" if m > 1 else "")
    if t == "loop":
        label = seg.get("label", "")
        repeat = seg.get("repeat", 1)
        variable = seg.get("variable", "")
        if repeat == 1 and label:
            return f'section "{label}"'
        rep = f"{{{variable}}}" if variable else str(repeat)
        return f'loop \u00d7{rep}' + (f' "{label}"' if label else "")
    return t


def _flatten_segments(segments):
    """Flatten a script into (key, seg) pairs."""
    items = []
    for seg in (segments or []):
        items.append((_seg_key(seg), seg))
        if seg.get("type") == "loop":
            items.extend(_flatten_segments(seg.get("segments", [])))
    return items


def _diff_scripts(old_script, new_script, stage_id=""):
    """Diff two stage scripts, returning a list of change dicts."""
    old_flat = _flatten_segments(old_script)
    new_flat = _flatten_segments(new_script)

    old_keys = {}
    for key, seg in old_flat:
        old_keys.setdefault(key, []).append(seg)
    new_keys = {}
    for key, seg in new_flat:
        new_keys.setdefault(key, []).append(seg)

    changes = []
    for key, segs in old_keys.items():
        new_count = len(new_keys.get(key, []))
        for seg in segs[new_count:]:
            changes.append({
                "action": "removed",
                "segment_type": seg.get("type", "unknown"),
                "description": _seg_desc(seg),
            })
    for key, segs in new_keys.items():
        old_count = len(old_keys.get(key, []))
        for seg in segs[old_count:]:
            changes.append({
                "action": "added",
                "segment_type": seg.get("type", "unknown"),
                "description": _seg_desc(seg),
            })
    return changes


def _diff_instruction_stages(old_stages, new_stages):
    """Diff instruction stage lists."""
    old_ids = {s.get("id"): s for s in old_stages}
    new_ids = {s.get("id"): s for s in new_stages}
    changes = []
    for sid, s in old_ids.items():
        if sid not in new_ids:
            changes.append({
                "action": "removed",
                "segment_type": "stage",
                "description": s.get("name", sid),
            })
    for sid, s in new_ids.items():
        if sid not in old_ids:
            changes.append({
                "action": "added",
                "segment_type": "stage",
                "description": s.get("name", sid),
            })
    return changes


def _diff_practice_items(old_weeks, new_weeks):
    """Diff practice week/day structures."""
    changes = []

    # Diff weeks
    old_wk = [w.get("label", f"Week {i+1}") for i, w in enumerate(old_weeks or []) if isinstance(w, dict)]
    new_wk = [w.get("label", f"Week {i+1}") for i, w in enumerate(new_weeks or []) if isinstance(w, dict)]
    for label in old_wk:
        if label not in new_wk:
            changes.append({"action": "removed", "segment_type": "week", "description": label})
    for label in new_wk:
        if label not in old_wk:
            changes.append({"action": "added", "segment_type": "week", "description": label})

    # Diff days (by week label + day label)
    def _day_keys(weeks):
        keys = {}
        for w in (weeks or []):
            if not isinstance(w, dict):
                continue
            wl = w.get("label", "Week")
            for d in w.get("days", []):
                dl = d.get("label", "Day")
                key = f"{wl} / {dl}"
                keys[key] = d
        return keys

    old_days = _day_keys(old_weeks)
    new_days = _day_keys(new_weeks)
    for key in old_days:
        if key not in new_days:
            changes.append({"action": "removed", "segment_type": "day", "description": key})
    for key in new_days:
        if key not in old_days:
            changes.append({"action": "added", "segment_type": "day", "description": key})

    # Diff stage items across all days
    def _extract_stage_refs(weeks):
        refs = {}
        for week in (weeks or []):
            if not isinstance(week, dict):
                continue
            wl = week.get("label", "Week")
            for day in week.get("days", []):
                dl = day.get("label", "Day")
                for item in day.get("items", []):
                    key = (wl, dl, item.get("meditation", ""), item.get("stage_id", ""))
                    refs.setdefault(key, []).append(item)
        return refs

    old_refs = _extract_stage_refs(old_weeks)
    new_refs = _extract_stage_refs(new_weeks)
    for key, items in old_refs.items():
        new_count = len(new_refs.get(key, []))
        for item in items[new_count:]:
            changes.append({
                "action": "removed",
                "segment_type": "practice_item",
                "description": f'{item.get("meditation_display", "")} > {item.get("stage_name", "")}',
            })
    for key, items in new_refs.items():
        old_count = len(old_refs.get(key, []))
        for item in items[old_count:]:
            changes.append({
                "action": "added",
                "segment_type": "practice_item",
                "description": f'{item.get("meditation_display", "")} > {item.get("stage_name", "")}',
            })
    return changes


class ChatView(APIView):
    """General context-aware chat endpoint."""
    def post(self, request):
        message = request.data.get("message", "")
        history = request.data.get("history", [])
        context = request.data.get("context", {})
        role = get_role(request.user)
        # Admin/editor can always mutate; builders can mutate their own content (checked per-mutation below)
        read_only = role not in ("admin", "editor", "builder")
        if not message:
            return Response({"error": "message required"}, status=400)
        try:
            result = chat(context, history, message, read_only=read_only)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

        # Apply mutations if present (never for read-only users)
        mutations = result.get("mutations")
        if read_only:
            result.pop("mutations", None)
            mutations = None
        if mutations:
            errors = []
            changes = []
            page = context.get("page")

            if page == "exercise":
                m = Meditation.objects.filter(
                    name=context.get("meditation")
                ).first()
                # Builders can only mutate their own content
                if m and role == "builder" and m.created_by != request.user:
                    m = None
                if m:
                    if "instructions" in mutations:
                        old_stages = (m.instructions or {}).get("stages", [])
                        new_stages = mutations["instructions"].get("stages", [])
                        changes.extend(_diff_instruction_stages(old_stages, new_stages))
                        try:
                            m.instructions = mutations["instructions"]
                            m.save()
                        except Exception as e:
                            errors.append(f"Failed to update instructions: {e}")
                    if "stages" in mutations:
                        for stage_id, stage_data in mutations["stages"].items():
                            try:
                                stage, created = Stage.objects.get_or_create(
                                    meditation=m, stage_id=stage_id,
                                )
                                old_script = stage.script or [] if not created else []
                                if "script" in stage_data:
                                    changes.extend(_diff_scripts(old_script, stage_data["script"], stage_id))
                                    stage.script = stage_data["script"]
                                if "variables" in stage_data:
                                    stage.variables = stage_data["variables"]
                                stage.save()
                            except Exception as e:
                                errors.append(
                                    f"Failed to update stage '{stage_id}': {e}"
                                )

            elif page in ("practice", "player"):
                from ..models import Practice
                p = Practice.objects.filter(
                    name=context.get("practice")
                ).first()
                if p and role == "builder" and p.created_by != request.user:
                    p = None
                if p and "items" in mutations:
                    try:
                        old_items = p.items or []
                        changes.extend(_diff_practice_items(old_items, mutations["items"]))
                        p.items = mutations["items"]
                        p.save()
                    except Exception as e:
                        errors.append(f"Failed to update practice: {e}")

            # Create new programme (works from any page)
            if "create_programme" in mutations:
                from ..models import Practice
                import uuid
                cp = mutations["create_programme"]
                try:
                    practice_id = f"prac-{uuid.uuid4().hex[:12]}"
                    Practice.objects.create(
                        name=practice_id,
                        display_name=cp.get("display_name", "New Programme"),
                        items=cp.get("items", []),
                        created_by=request.user,
                    )
                    result["created_programme"] = practice_id
                except Exception as e:
                    errors.append(f"Failed to create programme: {e}")

            if changes:
                result["changes"] = changes
            if errors:
                result["mutation_errors"] = errors

        return Response(result)


def _extract_loops(segments):
    result = []
    for seg in segments:
        if seg.get("type") == "loop":
            result.append({
                "variable": seg.get("variable", ""),
                "displayName": seg.get("variableDisplayName", seg.get("variable", "")),
                "repeat": seg.get("repeat", 1),
                "children": _extract_loops(seg.get("segments", [])),
            })
    return result


def _apply_loops(segments, loop_updates):
    loop_idx = 0
    for seg in segments:
        if seg["type"] == "loop" and loop_idx < len(loop_updates):
            seg["repeat"] = loop_updates[loop_idx].get("repeat", seg["repeat"])
            children = loop_updates[loop_idx].get("children", [])
            if children:
                _apply_loops(seg.get("segments", []), children)
            loop_idx += 1
