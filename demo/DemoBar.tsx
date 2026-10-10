import { useState } from 'react';
import { DEMO_USERS, getDemoRole, switchDemoRole, type DemoRole } from './identity';
import { resetDemoState } from './backend/store';

const REPO_URL = 'https://github.com/NafYoung/ai-academy-miaoda-showcase';

/** 左下角演示控制条：说明数据性质、切换视角、重置数据。 */
export function DemoBar() {
  const current = getDemoRole();
  const [open, setOpen] = useState(() => {
    const saved = window.localStorage.getItem('athena-demo:bar-collapsed');
    // 没有偏好时：桌面端展开，手机端收起，避免遮挡内容。
    return saved === null ? window.innerWidth >= 640 : saved !== '1';
  });

  const toggle = (): void => {
    window.localStorage.setItem('athena-demo:bar-collapsed', open ? '1' : '0');
    setOpen(!open);
  };

  const reset = (): void => {
    resetDemoState();
    window.location.reload();
  };

  if (!open) {
    return (
      <button type="button" className="demo-bar-pill" onClick={toggle}>
        演示版 · {DEMO_USERS[current].roleLabel}视角
      </button>
    );
  }

  return (
    <aside className="demo-bar" aria-label="演示控制">
      <div className="demo-bar-head">
        <strong>演示版</strong>
        <span>合成数据 · 无需登录 · 数据只保存在本标签页</span>
        <button type="button" className="demo-bar-close" onClick={toggle} aria-label="收起">
          ×
        </button>
      </div>
      <p className="demo-bar-label">切换视角</p>
      <div className="demo-bar-roles">
        {(Object.keys(DEMO_USERS) as DemoRole[]).map((role) => (
          <button
            key={role}
            type="button"
            className={role === current ? 'is-active' : ''}
            onClick={() => role !== current && switchDemoRole(role)}
            title={DEMO_USERS[role].roleHint}
          >
            <b>{DEMO_USERS[role].roleLabel}</b>
            <small>{DEMO_USERS[role].name}</small>
          </button>
        ))}
      </div>
      <p className="demo-bar-hint">{DEMO_USERS[current].roleHint}</p>
      <div className="demo-bar-actions">
        <button type="button" onClick={reset}>
          重置演示数据
        </button>
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          关于这个项目 ↗
        </a>
      </div>
    </aside>
  );
}
