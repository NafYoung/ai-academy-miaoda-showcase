/** 演示版不接入 aily 智能体，只在容器内显示说明。 */
export interface AgentSDKInstance {
  destroy(): Promise<void>;
}

export async function initAgentChat(container: HTMLElement, _options: { channelToken: string }): Promise<AgentSDKInstance> {
  const note = document.createElement('p');
  note.textContent = '演示版未接入 AI 助手。';
  note.style.cssText = 'padding:24px;color:#64748b;font-size:14px;';
  container.appendChild(note);
  return {
    async destroy() {
      note.remove();
    },
  };
}
