from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import AssembledOutput, PracticeSession, Stage


def _build_exercise_details(sessions):
    """Batch-load stage and output data for all sessions at once."""
    # Collect all unique (meditation, stage_id) pairs across all sessions
    stage_keys = set()
    for s in sessions:
        if not s.practice:
            continue
        weeks = s.practice.items or []
        if s.week < len(weeks):
            days = weeks[s.week].get("days", [])
            if s.day < len(days):
                for item in days[s.day].get("items", []):
                    med = item.get("meditation", "")
                    sid = item.get("stage_id", "")
                    if med and sid:
                        stage_keys.add((med, sid))

    if not stage_keys:
        return {}

    # Batch-load all needed stages
    from django.db.models import Q
    stage_q = Q()
    for med, sid in stage_keys:
        stage_q |= Q(meditation_id=med, stage_id=sid)
    stages = {(s.meditation_id, s.stage_id): s for s in Stage.objects.filter(stage_q)}

    # Batch-load all assembled outputs for those stages
    # Most-recent assembled output per (meditation, stage) — keyed without hash
    output_map = {}  # (meditation_id, stage_pk) -> duration
    outputs = AssembledOutput.objects.filter(
        stage__in=stages.values()
    ).select_related("stage").order_by("id")
    for o in outputs:
        output_map[(o.meditation_id, o.stage_id)] = o.duration

    return stages, output_map


def _get_exercise_duration(item, stages, output_map):
    """Look up cached duration for a single exercise item."""
    med = item.get("meditation", "")
    sid = item.get("stage_id", "")
    stage = stages.get((med, sid))
    if not stage:
        return None
    return output_map.get((med, stage.pk))


def _format_variables(item):
    variables = {}
    for k, v in (item.get("variables") or {}).items():
        if isinstance(v, dict):
            variables[v.get("displayName", k)] = f"{v.get('value', '')} {v.get('unit', '')}".strip()
        else:
            variables[k] = str(v)
    return variables


def _serialize_sessions(sessions):
    """Serialize sessions with exercise details, using batched queries."""
    stages, output_map = _build_exercise_details(sessions) if sessions else ({}, {})

    result = []
    for s in sessions:
        exercises = []
        if s.practice:
            weeks = s.practice.items or []
            if s.week < len(weeks):
                days = weeks[s.week].get("days", [])
                if s.day < len(days):
                    for item in days[s.day].get("items", []):
                        exercises.append({
                            "meditation_display": item.get("meditation_display", item.get("meditation", "")),
                            "stage_name": item.get("stage_name", ""),
                            "duration": _get_exercise_duration(item, stages, output_map),
                            "variables": _format_variables(item),
                        })

        result.append({
            "id": str(s.id),
            "practice": s.practice_id,
            "practice_display": s.practice_display or (s.practice.display_name if s.practice else ""),
            "week": s.week,
            "day": s.day,
            "day_label": s.day_label,
            "duration": s.duration,
            "completed_at": s.completed_at.isoformat(),
            "exercises": exercises,
        })
    return result


class HistoryListView(APIView):
    def get(self, request):
        """List the user's practice sessions, most recent first."""
        sessions = list(PracticeSession.objects.filter(
            user=request.user
        ).select_related("practice")[:200])
        return Response(_serialize_sessions(sessions))

    def post(self, request):
        """Log a completed practice session."""
        practice_name = request.data.get("practice")
        if not practice_name:
            return Response({"error": "practice required"}, status=400)

        session = PracticeSession.objects.create(
            user=request.user,
            practice_id=practice_name,
            practice_display=request.data.get("practice_display", ""),
            week=request.data.get("week", 0),
            day=request.data.get("day", 0),
            day_label=request.data.get("day_label", ""),
            duration=request.data.get("duration", 0),
        )

        return Response({
            "id": str(session.id),
            "completed_at": session.completed_at.isoformat(),
        }, status=201)
