import hashlib
import json
import re
import uuid

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Category, Group, Meditation, Stage
from ..permissions import IsAdmin, IsAdminOrReadOnly
from ..services import storage
from ..services.chat import chat
from ..services.extract_instructions import extract_instructions


class MeditationListView(APIView):
    permission_classes = [IsAdminOrReadOnly]
    def get(self, request):
        meds = []
        for m in Meditation.objects.prefetch_related("stages").order_by("name"):
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
            })
        return Response(meds)

    def post(self, request):
        display_name = (request.data.get("display_name") or "").strip()
        category = (request.data.get("category") or "uncategorised").strip()
        if not display_name:
            return Response({"error": "display_name required"}, status=400)
        med_id = f"med-{uuid.uuid4().hex[:12]}"
        Meditation.objects.create(
            name=med_id, display_name=display_name, category=category,
        )
        return Response({
            "name": med_id,
            "display_name": display_name,
            "category": category,
            "stages": [],
        }, status=201)


class MetaView(APIView):
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request, name):
        m = get_object_or_404(Meditation, name=name)
        return Response({
            "display_name": m.display_name,
            "category": m.category,
        })

    def put(self, request, name):
        m, _ = Meditation.objects.get_or_create(name=name)
        if "display_name" in request.data:
            m.display_name = request.data["display_name"]
        if "category" in request.data:
            m.category = request.data["category"]
        m.save()
        return Response({"status": "ok"})

    def delete(self, request, name):
        m = get_object_or_404(Meditation, name=name)
        m.delete()
        return Response({"status": "ok"})


def _serialize_category(cat):
    return {
        "name": cat.name,
        "display_name": cat.display_name,
        "sort_order": cat.sort_order,
        "group": cat.group_id or "",
        "group_display": cat.group.display_name if cat.group else "",
    }


def _resolve_group(group_str):
    """Look up a Group by ID. Returns None for empty string."""
    if not group_str:
        return None
    return Group.objects.filter(name=group_str).first()


class GroupListView(APIView):
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request):
        return Response([
            {"name": g.name, "display_name": g.display_name, "sort_order": g.sort_order}
            for g in Group.objects.all()
        ])

    def post(self, request):
        display_name = (request.data.get("display_name") or "").strip()
        if not display_name:
            return Response({"error": "display_name required"}, status=400)
        slug = f"group-{uuid.uuid4().hex[:8]}"
        group = Group.objects.create(name=slug, display_name=display_name, sort_order=50)
        return Response({
            "name": group.name, "display_name": group.display_name, "sort_order": group.sort_order,
        }, status=201)


class GroupDetailView(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, name):
        group = get_object_or_404(Group, name=name)
        if "display_name" in request.data:
            group.display_name = request.data["display_name"]
        if "sort_order" in request.data:
            group.sort_order = request.data["sort_order"]
        group.save()
        return Response({"name": group.name, "display_name": group.display_name})

    def delete(self, request, name):
        group = get_object_or_404(Group, name=name)
        group.categories.update(group=None)
        group.delete()
        return Response({"status": "ok"})


class CategoryListView(APIView):
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request):
        return Response([
            _serialize_category(c)
            for c in Category.objects.select_related("group").all()
        ])

    def post(self, request):
        display_name = (request.data.get("display_name") or "").strip()
        if not display_name:
            return Response({"error": "display_name required"}, status=400)
        cat_id = f"cat-{uuid.uuid4().hex[:12]}"
        group = _resolve_group((request.data.get("group") or "").strip())
        cat = Category.objects.create(
            name=cat_id, display_name=display_name, sort_order=50, group=group,
        )
        return Response(_serialize_category(cat), status=201)


class CategoryDetailView(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, category):
        cat = get_object_or_404(Category, name=category)
        if "display_name" in request.data:
            cat.display_name = request.data["display_name"]
        if "sort_order" in request.data:
            cat.sort_order = request.data["sort_order"]
        if "group" in request.data:
            cat.group = _resolve_group(request.data["group"])
        cat.save()
        return Response({"status": "ok"})

    def delete(self, request, category):
        cat = get_object_or_404(Category, name=category)
        Meditation.objects.filter(category=category).update(category="uncategorised")
        cat.delete()
        return Response({"status": "ok"})


class InstructionsView(APIView):
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request, name):
        m = get_object_or_404(Meditation, name=name)
        instructions = m.instructions or {"description": "", "stages": []}
        return Response(instructions)

    def put(self, request, name):
        m, _ = Meditation.objects.get_or_create(name=name)
        m.instructions = request.data
        m.save()
        return Response({"status": "ok"})


class InstructionsPdfView(APIView):
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request, name):
        path = storage.pdf_path(name)
        return Response({"exists": storage.file_exists(path)})

    def post(self, request, name):
        if "file" not in request.FILES:
            return Response({"error": "no file"}, status=400)
        f = request.FILES["file"]
        path = storage.pdf_path(name)
        storage.upload_file(path, f.read(), content_type="application/pdf")
        return Response({"status": "ok"})

    def delete(self, request, name):
        path = storage.pdf_path(name)
        storage.delete_file(path)
        return Response({"status": "ok"})


class LoopsView(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, name):
        m = get_object_or_404(Meditation, name=name)
        _apply_loops(m.script, request.data)
        m.save()
        return Response({"status": "ok"})


class ExtractInstructionsView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, name):
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
        read_only = not (request.user and request.user.is_staff)
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
