import { avatarFor, getDemoUser } from '@demo/identity';

export function useCurrentUserProfile() {
  const user = getDemoUser();
  const avatar = avatarFor(user.name);
  return {
    user_id: user.userId,
    name: user.name,
    avatar,
    email: `${user.role}@athena-demo.example`,
    userName: user.name,
    userAvatar: avatar,
  };
}
