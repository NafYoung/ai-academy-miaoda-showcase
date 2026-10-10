import { toast } from 'sonner';

/** 演示版没有登录与退出；保留原调用形状，提示访客切换视角即可。 */
export const authClient = {
  session: {
    async redirectToLogin(_options?: { returnUrl?: string }): Promise<void> {
      toast.info('演示版无需登录，可在左下角切换员工 / 讲师 / 管理员视角');
    },
    async signOut(): Promise<{ error: Error | null }> {
      toast.info('演示版没有退出登录，可在左下角切换视角或重置演示数据');
      return { error: new Error('demo') };
    },
  },
};
