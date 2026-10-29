import { redirect } from 'next/navigation';

/** 我的资料 moved to 设置 (/settings). */
export default function ProfileRedirect() {
  redirect('/settings');
}
