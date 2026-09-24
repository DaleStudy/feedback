// wrangler secret put 으로 등록하는 값들. wrangler types 는 시크릿을 모르므로 여기서 보강한다.
declare namespace Cloudflare {
  interface Env {
    GITHUB_CLIENT_ID: string
    GITHUB_CLIENT_SECRET: string
  }
}
