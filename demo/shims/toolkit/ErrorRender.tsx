export function ErrorRender({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div style={{ padding: 48, fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h2>页面出错了</h2>
      <p style={{ color: '#64748b' }}>{error?.message}</p>
      <button type="button" onClick={resetErrorBoundary} style={{ marginTop: 16 }}>重试</button>
    </div>
  );
}
