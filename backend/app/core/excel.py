"""Xuất báo cáo ra file Excel (dùng chung cho các cấp báo cáo)."""
import io


def build_excel_response(filename: str, rows: list, columns: list):
    import pandas as pd
    from fastapi.responses import StreamingResponse

    df = pd.DataFrame(rows, columns=columns)
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="BaoCao")
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
