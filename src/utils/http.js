export function ok(res, data) {
  return res.status(200).json({ ok: true, data });
}
export function badRequest(res, error) {
  return res.status(400).json({ ok: false, error });
}
export function serverError(res, error) {
  return res.status(500).json({ ok: false, error: String(error) });
}
