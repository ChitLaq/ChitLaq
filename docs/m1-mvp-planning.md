harika—ChitLaq için mikroservis + self-hosted Supabase temelli bir repo rehberi ve M1 (MVP) planını tek seferde, uygulamaya koyabileceğin netlikte veriyorum. Aşağıdaki yapı; 50.000 toplam kullanıcı, eşzamanlı 5.000 kullanıcı hedefi; realtime (mesajlaşma), TailAdmin tabanlı admin paneli, “sadece kayıtlı üniversite mail **prefix**/pattern” ile Auth ve tüm saydığın modülleri kapsıyor.

# GitHub Monorepo Stratejisi (Çoklu Repo)

Her servis ayrı repoda; ortak tipler ve CI şablonları bir “shared” repoda. Önerilen adlandırma: `chitlaq-<bileşen>`.

## 0) Kurumsal Rehber Repo

* **Repo:** `chitlaq-orga`
* **Amaç:** Merkez dokümantasyon, karar kayıtları (ADR), mimari diyagramlar, yol haritası, contribution guide.
* **İçerik:**

  * `/docs/architecture/` (C4 diyagramları, veri akışları)
  * `/docs/security/` (tehdit modeli, RLS kuralları, gizlilik)
  * `/docs/sre/` (runbook’lar, incident playbook)
  * `ADR-0001-service-boundaries.md`
  * `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`

## 1) Altyapı (IaC + Platform)

* **Repo:** `chitlaq-infra`
* **Stack:** Terraform + Ansible, Kubernetes (kops/AKS/GKE), Helm, ArgoCD.
* **İçerik:**

  * `terraform/` (VPC, K8s, LB, managed DNS)
  * `k8s/helm/` (chart’lar: gateway, services, grafana, prometheus, loki, tempo)
  * `argocd/` (app-of-apps)
  * `secrets/` (SOPS, age)
  * `makefile` (bootstrap, apply)

## 2) Supabase (Self-Hosted)

* **Repo:** `chitlaq-supabase`
* **Bölümler:**

  * `docker/` (self-hosted Supabase stack: Postgres, Realtime, Studio, Storage, Functions)
  * `db/`

    * `schemas/` (her mikroservis için ayrı schema: `auth`, `profiles`, `posts`, `messages`, `notifications`, `admin`, `analytics`)
    * `migrations/` (SQL)
    * `rls/` (Row Level Security policy dosyaları)
    * `functions/` (Postgres functions/trigger’lar)
  * `seed/` (geliştirme verileri)
* **Not:** Mikroservis başına **ayrı schema** + **RLS**. İleride yatay bölmek gerekirse logical replication/CDC ile ayrıştırılır.

## 3) API Gateway

* **Repo:** `chitlaq-gateway`
* **Stack:** Kong/Envoy + OPA (policy), rate limiting, JWT doğrulama, domain-bazlı auth kuralı.
* **İşlev:** Tek giriş; servis keşfi; istek/yanıt log’lama; retry/circuit breaker.

## 4) Auth Servisi

* **Repo:** `chitlaq-auth`
* **Stack:** NestJS (TS) + Supabase Auth API entegrasyonu.
* **Özellik:**

  * “Sadece **izinli üniversite email prefix/pattern**” ile kayıt/giriş (ör.: `allowed_prefixes` tablosu — regex/pattern).
  * Domain-bazlı whitelisting opsiyonu (ilerisi için).
  * Oturum/refresh, E2E testler, RLS testleri.
* **DB (schema: `auth`)**: `allowed_prefixes`, `users`, `sessions`, `audit_logs`.

## 5) Profil Servisi

* **Repo:** `chitlaq-profile`
* **Stack:** NestJS; Storage (Supabase) ile profil resmi upload; RLS.
* **Model:** `profiles(id, username UNIQUE, bio, avatar_url, links, created_at)`
* **Public profile link:** `chitlaq.app/u/:username` (gateway yönlendirmesi).

## 6) Post Servisi

* **Repo:** `chitlaq-posts`
* **Özellik:** Yazılı post; mention (@kullanıcı), hashtag `#etiket`, link.
* **Model:**

  * `posts(id, author_id, text, created_at, visibility)`
  * `post_hashtags(post_id, tag)` (GIN index)
  * `post_mentions(post_id, mentioned_user_id)`
  * Beğeni/yorum M2: `post_likes`, `post_replies` (M1’de yorum opsiyonel—sadece yazı ve beğeni temel).

## 7) Feed Servisi

* **Repo:** `chitlaq-feed`
* **Amaç:** Takip/ilgi alanı/keşfet akışı.
* **Yaklaşım (M1):**

  * Basit: **Fan-out on read** (sorgu zamanında hesapla) + Redis önbellek.
  * Keşfet: Hashtag trend + popüler postlar (son X saat).
* **Model:** `follows(follower_id, followee_id)`, `interests(user_id, tag)`

## 8) Sosyal Grafik (Arkadaş/Takip/Engelle)

* **Repo:** `chitlaq-social`
* **Model:**

  * `follows`, `blocks`, `friend_suggestions(candidate_user_id, score)` (materialized view ile basit öneri).

## 9) Mesajlaşma Servisi (Realtime)

* **Repo:** `chitlaq-messages`
* **Stack:** Go (yüksek eşzamanlılık) veya NestJS + Supabase Realtime/WebSocket.
* **Model:**

  * `conversations(id, type[dm/group])`, `conversation_members(conv_id, user_id)`
  * `messages(id, conv_id, sender_id, text, created_at, read_at)`
* **Not:** M1’de DM; grup M2. Realtime sadece mesajlaşmada.

## 10) Bildirim Servisi

* **Repo:** `chitlaq-notifications`
* **Türler:** mention, takip edildi, post beğenisi, mesaj; sessize alma.
* **Push:** Web Push (VAPID) + opsiyonel Firebase APNs/FCM.
* **Model:** `notifications(id, user_id, type, payload, is_read, muted_topic)`

## 11) Arama Servisi

* **Repo:** `chitlaq-search`
* **M1 yaklaşım:** Postgres full-text + trigram (pg\_trgm) (kullanıcı, hashtag, post).
* **API:** `/search?q=...&type=users|posts|tags`

## 12) Analytics & Logging

* **Repo:** `chitlaq-analytics`
* **Stack:** OpenTelemetry (trace), Loki (log), Prometheus (metrics), Grafana (dashboard).
* **ETL (opsiyonel):** Kafka/NATS → Parquet (S3/MinIO) → DuckDB/ClickHouse (M2).

## 13) Moderasyon & Admin

* **Repo (Admin Web):** `chitlaq-admin-web` (Next.js + TailAdmin UI)
* **Repo (Moderation API):** `chitlaq-moderation` (rapor/şikâyet, içerik kaldırma, kullanıcı cezaları, reklam yönetimi)

## 14) Web Uygulaması (Kullanıcı)

* **Repo:** `chitlaq-web` (Next.js 14/15, App Router, Tailwind, shadcn/ui)
* **Tema:** Ay çekirdeği (turkuaz & gri), erişilebilirlik, RTL hazır.

## 15) Shared

* **Repo:** `chitlaq-shared`
* **İçerik:** TypeScript tipleri, DTO’lar, OpenAPI şemaları, UI tasarım sistemi token’ları, eslint/prettier config.

---

# Çapraz-Kesim Kararlar

* **Diller:** Çoğunluk NestJS (TS). Mesajlaşma yüksek yükte Go olabilir.
* **İletişim:** REST (OpenAPI) + async event (NATS JetStream).
* **Kimlik:** Supabase Auth + JWT/Session, gateway’de doğrulama.
* **Cache:** Redis (feed, arama peek, rate limit).
* **Depolama:** Supabase Postgres (ayrı schema’lar), Supabase Storage (avatar vs).
* **RLS:** Kullanıcı kendi satırını görür; mesaj/conversation üyeliği olmadan erişim yok; admin rollerinde bypass (SECURITY DEFINER kontrollü).
* **CI/CD:** GitHub Actions → Docker → Helm → ArgoCD.
* **Gözlemlenebilirlik:** OTel (trace), Prometheus (HPA’ya metrik), Grafana.
* **Oranlama/RL:** Gateway + Redis (IP/JWT bazlı).

---

# Kapasite ve Ölçek (M1 hedefi)

* **Kullanıcı:** 50k toplam; **eşzamanlı 5k** (spike: 6–7k).
* **Mesaj:** 5k CCU’da \~2–3 msg/s kişi başı pikte 10–15k msg/s üst sınır öngörüsü → Go/NestJS + Realtime kanalı sharding.
* **K8s:** 3 node (prod başlangıç), HPA: CPU 60%/P95 latency 150ms.
* **DB:** Postgres 4 vCPU/16GB RAM (başlangıç), GIN/GIST indeksleri; `work_mem` ayarlı; Realtime ayrı pod.
* **Cache:** Redis 2–3 replika; NATS JetStream 3 node (quorum).
* **Depolama:** MinIO (opsiyonel), CDN önünde (Cloudflare/NGINX).

---

# M1 (MVP) Planı — Zorunlu Özelliklerle Yol Haritası

## Sprint 0 — Bootstrap (1 hafta)

* `chitlaq-infra`: dev cluster + ArgoCD bootstrap.
* `chitlaq-supabase`: Postgres up, schema’lar, temel RLS + seed.
* `chitlaq-gateway`: JWT doğrulama, rate limit, CORS.
* Observability stack (Grafana/Prometheus/Loki/Tempo) çalışır.

## Sprint 1 — Auth + Onboarding (1–1.5 hafta)

* **Auth (MUST):**

  * Allowed **email prefix/pattern** tablosu (örn. `cs_`, `ee_` gibi departman prefixleri veya bireysel whitelist) + opsiyonel domain kısıtı.
  * Kaydol/OTP (email magic link) → profil başlangıcı.
* **Onboarding:** İlgi alanı seçimleri, kullanıcı adı, avatar yükleme (Storage), kısa bio.
* **RLS/Test:** Yetkisiz erişim blokları; E2E.

**Kabul kriterleri:** Prefix kuralı olmayan email girişi reddedilir; onboarding tamamlanmadan feed/mesaj erişimi yok.

## Sprint 2 — Profile + Friend (1 hafta)

* Profil görüntüleme/düzenleme (avatar, bio, username, link).
* Takip et/çıkar, engelle; basit arkadaş önerileri (ortak takip + aynı üniversite prefix skoru).
* Arayüz: Facebook/Twitter benzeri profil header.

**Kabul:**

* `GET /u/:username` public profil; engellediğin görünmez.
* Öneriler listesinde 10 aday.

## Sprint 3 — Posts + Feed (1.5 hafta)

* Yazı postla, mention/hashtag parse; beğeni.
* Feed: “Takip Edilen”, “Keşfet”, “İlgi Alanı”.
* Arama çubuğu (kullanıcı/hashtag/post).
* Permalink: `/p/:id`

**Kabul:**

* Hashtag tıklanınca ilgili akış.
* Arama P95 < 300ms (cache’li).

## Sprint 4 — Messaging (Realtime) (1–1.5 hafta)

* DM oluştur, mesaj gönder/al (Supabase Realtime veya WS).
* Okundu bilgisi, mesaj geçmişi sayfalama.
* Discord benzeri basic UI (sol sohbet listesi, sağ mesaj paneli).

**Kabul:**

* P95 gönderim-alım < 150ms (aynı bölgede).
* 5k CCU testinde mesaj kaybı yok (JetStream kalıcılık varsa M2’ye).

## Sprint 5 — Notifications + Admin + Monitoring (1 hafta)

* Bildirim: mention/takip/beğeni/DM; sessize alma (topic mute).
* Web Push (permission akışı).
* **Admin Web (TailAdmin):**

  * Kullanıcı arama, içerik moderasyonu (post sil, kullanıcı sustur/ban), rapor kutusu.
* **Monitoring:** Grafana dashboard’ları (API latency, error rate, DB qps, WS connections).

**Kabul:**

* Admin eylemleri audit log’a işlenir.
* Bildirim tercihleri kullanıcı bazlı çalışır.

## Sprint 6 — Analytics + Monetization (0.5–1 hafta)

* Event logging (OpenTelemetry + Loki; sayfa görüntüleme, post etkileşimi).
* Basit metrik panoları.
* Monetization: Web’de Google Ads alanı (MVP: sadece feed sayfasında 1–2 slot, frekans sınırı).

**Kabul:**

* Temel KPI grafikleri: DAU/MAU, mesaj sayısı, yeni kayıtlar.
* Reklam bileşeni görünür, kullanıcı gizlilik banner’ı (çerez/izin).

> Toplam: \~7–8 hafta tek ekip; paralelleştirme ile daha kısa.

---

# Supabase Şema & RLS Taslakları (özet)

**Örnek tablolar:**

```sql
-- auth.allowed_prefixes
CREATE TABLE auth.allowed_prefixes (
  id SERIAL PRIMARY KEY,
  prefix TEXT NOT NULL,        -- örn: 'cs_', 'ee_', '2025_'
  note TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- profiles.profiles
CREATE TABLE profiles.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  bio TEXT,
  avatar_url TEXT,
  links JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE profiles.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile"
  ON profiles.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "edit_own_profile"
  ON profiles.profiles FOR UPDATE USING (id = auth.uid());
```

**Kayıt kontrolü (örnek mantık):**

* Signup akışında e-mail local-part (prefix) `lower(left(email, position('@')-1))` alınır ve `auth.allowed_prefixes` içinde **LIKE/regex** kontrolü yapılır; değilse kayıt iptal (Auth hook veya edge function).

---

# API Uçları (M1 çekirdek)

* **Auth:** `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`
* **Profile:** `GET /profiles/:username`, `PATCH /profiles/me`, `PUT /profiles/me/avatar`
* **Social:** `POST /follow/:userId`, `DELETE /follow/:userId`, `POST /block/:userId`
* **Posts:** `POST /posts`, `GET /posts/:id`, `GET /users/:id/posts`, `POST /posts/:id/like`
* **Feed:** `GET /feed/home`, `GET /feed/explore?tag=...`
* **Messages:** `POST /conversations`, `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`
* **Notifications:** `GET /notifications`, `POST /notifications/mute`, `POST /push/subscribe`
* **Search:** `GET /search?q=...&type=users|posts|tags`
* **Admin:** `GET /admin/users`, `POST /admin/users/:id/ban`, `DELETE /admin/posts/:id`

---

# Güvenlik & Uyumluluk

* **RLS first**: tüm tablo ve görünümlerde RLS açık.
* **JWT**: kısa ömür + refresh, cihaz/ip meta log’u.
* **Rate limit**: login/signup, mesaj gönderim/like (ör. 5–10 req/s kullanıcı başı).
* **İçerik raporu:** `moderation.reports`.
* **Privacy:** minimal veri; reklam için izin katmanı.

---

# Geliştirici Deneyimi (DX)

* **Branch modeli:** trunk-based + kısa feature branşları.
* **Commit:** Conventional Commits.
* **PR şablonu:** test planı, ölçütler, güvenlik etkisi.
* **CI:** lint, test, build, docker; schema drift kontrolü.
* **Preview env:** her PR için ephemeral namespace.

---

# Admin Panel (TailAdmin) Uygulama Notları

* **Sayfalar:** Dashboard, Users, Reports, Posts, Bans, Ads, Feature Flags.
* **Yetki:** `admin`, `moderator`, `viewer`.
* **Audit:** tüm admin aksiyonları `admin.audit_logs`’a.

---

# Monetization (M1)

* **Google Ads (web):** feed içinde 10 postta 1 slot, frequency capping; oturum açmış kullanıcıda kişiselleştirme iznine bağlı.
* **Admin yönetimi:** reklam slot etkinliği, yoğunluk ayarı (M2).

---

# “Yap ve Paylaş” Check-List

1. `chitlaq-orga` ile başla (yukarıdaki dokümanların iskeletini pushla).
2. `chitlaq-infra` dev ortamı ayağa kaldır.
3. `chitlaq-supabase` (schema + RLS + seeds).
4. `chitlaq-gateway` + `chitlaq-auth` (prefix kuralı dahil).
5. `chitlaq-web` (Onboarding → Profile).
6. `chitlaq-social`, `chitlaq-posts`, `chitlaq-feed`.
7. `chitlaq-messages` (Realtime).
8. `chitlaq-notifications`, `chitlaq-search`.
9. `chitlaq-admin-web` + `chitlaq-moderation`.
10. `chitlaq-analytics` dashboard’ları bağla.

---
