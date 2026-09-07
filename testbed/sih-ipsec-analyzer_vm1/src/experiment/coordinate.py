def advance(C: list[int], P: list[int]) -> bool:
    if len(C) != len(P):
        raise ValueError("Coordinate and limits must have the same length")

    for i in range(len(C) - 1, -1, -1):
        C[i] += 1

        if C[i] < P[i]:
            return True

        C[i] = 0

    return False