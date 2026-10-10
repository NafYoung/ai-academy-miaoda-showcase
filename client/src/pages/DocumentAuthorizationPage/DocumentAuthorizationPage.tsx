import { useEffect, useState } from 'react';

/** Contains no SDK/user tokens; hands the one-use OAuth code to its same-origin opener. */
export default function DocumentAuthorizationPage() {
  const [message, setMessage] = useState('正在完成授权…');
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (!window.opener || !query.get('state')) {
      setMessage('请从课程页面重新发起授权。');
      return;
    }
    window.opener.postMessage(
      {
        type: 'athena-document-authorization',
        code: query.get('code'),
        state: query.get('state'),
        error: query.get('error'),
      },
      window.location.origin,
    );
    // Remove the one-use code from the current history entry immediately.
    window.history.replaceState(null, '', window.location.pathname);
    setMessage('授权结果已返回课程页面，可以关闭此窗口。');
    window.close();
  }, []);
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p role="status">{message}</p>
    </main>
  );
}
