// Solves A·x = b by Gaussian elimination with partial pivoting. A and b are modified.
export function solveLinear(A, b) {
  const n = b.length;
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let r = k + 1; r < n; r++) if (Math.abs(A[r][k]) > Math.abs(A[p][k])) p = r;
    if (Math.abs(A[p][k]) < 1e-18) continue;
    if (p !== k) { [A[p], A[k]] = [A[k], A[p]]; [b[p], b[k]] = [b[k], b[p]]; }
    for (let r = k + 1; r < n; r++) {
      const f = A[r][k] / A[k][k];
      if (!f) continue;
      for (let c = k; c < n; c++) A[r][c] -= f * A[k][c];
      b[r] -= f * b[k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let c = r + 1; c < n; c++) s -= A[r][c] * x[c];
    x[r] = Math.abs(A[r][r]) < 1e-18 ? 0 : s / A[r][r];
  }
  return x;
}
