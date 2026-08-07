from core.face_analysis import FaceAnalyzer


def test_face_analyzer_can_be_imported_without_insightface():
    analyzer = FaceAnalyzer()
    assert analyzer is not None
    assert analyzer.app is None or hasattr(analyzer.app, "get")
