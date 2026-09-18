// 익명 설문의 응답자 키. 같은 사람의 중복 응답만 막고 누가 썼는지는 복원할 수 없어야 한다.
// 단순 SHA(userId) 는 GitHub id 가 공개 정보라 역산 가능하므로 서버만 아는 secret 으로 HMAC 을 건다.
// surveyId 를 섞어 설문 간 응답 연결도 불가능하게 한다.
export async function anonymousRespondentKey(secret: string, surveyId: string, userId: number) {
  if (!secret) throw new Error('HMAC_SECRET 이 설정되지 않았습니다')
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${surveyId}:${userId}`))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}
