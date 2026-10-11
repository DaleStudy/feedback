// 배포할 때 GitHub secret에서 넣는 값. wrangler types 는 시크릿을 모르므로 여기서 보강한다.
declare namespace Cloudflare {
  interface Env {
    GITHUB_CLIENT_SECRET: string
  }
}
