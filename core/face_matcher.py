import numpy as np

def tinh_cosine_similarity(vector_a, vector_b):
    """
    Tính độ tương đồng Cosine giữa 2 vector đặc trưng A và B.
    Công thức: Cosine_Similarity = (A . B) / (||A|| * ||B||)
    """
    tich_vo_huong = np.dot(vector_a, vector_b)
    do_dai_a = np.linalg.norm(vector_a)
    do_dai_b = np.linalg.norm(vector_b)
    
    # Tránh chia cho 0
    if do_dai_a == 0 or do_dai_b == 0:
        return 0.0, do_dai_a, do_dai_b
        
    cosine_score = tich_vo_huong / (do_dai_a * do_dai_b)
    return cosine_score, do_dai_a, do_dai_b
