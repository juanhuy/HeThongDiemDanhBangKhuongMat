from app.crud.crud_lecturer import build_lecturer_id


def test_build_lecturer_id_formats_with_year_and_sequence():
    assert build_lecturer_id(1, 2026) == "GV2026001"


def test_build_lecturer_id_zero_pads_sequence():
    assert build_lecturer_id(12, 2026) == "GV2026012"
