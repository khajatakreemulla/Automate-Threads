# Threads Auto-Poster

Posts items from `posts.json` to Threads automatically, one every 4 hours, using GitHub Actions (the scheduler) and GitHub Pages (an optional status dashboard).

## How it works

- `posts.json` is your queue — a list of posts with a `posted: false/true` flag.
- `.github/workflows/post-to-threads.yml` runs every 4 hours (also runnable manually), finds the first unposted item, posts it, and commits the queue back with `posted: true`.
- `index.html` is a read-only dashboard you can view at your GitHub Pages URL.

When the queue runs out, the workflow just logs "queue is empty" and does nothing — add more entries to `posts.json` any time to keep it going.

---

## 1. Get Threads API access (one-time, ~15 min)

1. Go to [developers.facebook.com](https://developers.facebook.com/) → **My Apps** → **Create App**. Choose the **"Other"** use case, then business type, and add the **Threads** product to the app when prompted.
2. In your app's **Threads → Get Started** settings, add yourself as a **Threads tester** under Roles (uses your Instagram-linked Threads account), then accept the tester invite in the Threads app itself (Settings → Website permissions, on your phone).
3. Under App settings → Basic, note your **App ID** and **App Secret**.
4. Generate an authorization URL (replace the placeholders) and open it in a browser:
   ```
   https://threads.net/oauth/authorize?client_id=YOUR_APP_ID&redirect_uri=YOUR_REDIRECT_URI&scope=threads_basic,threads_content_publish&response_type=code
   ```
   Any URL you control can be the `redirect_uri` (even `https://localhost/`) as long as it's listed in your app's settings — you're just reading the `code` param off the resulting redirect.
5. Exchange that `code` for a **short-lived token**:
   ```bash
   curl -X POST "https://graph.threads.net/oauth/access_token" \
     -F "client_id=YOUR_APP_ID" \
     -F "client_secret=YOUR_APP_SECRET" \
     -F "grant_type=authorization_code" \
     -F "redirect_uri=YOUR_REDIRECT_URI" \
     -F "code=THE_CODE_FROM_STEP_4"
   ```
6. Exchange the short-lived token for a **long-lived token** (lasts 60 days):
   ```bash
   curl -G "https://graph.threads.net/access_token" \
     -d "grant_type=th_exchange_token" \
     -d "client_secret=YOUR_APP_SECRET" \
     -d "access_token=SHORT_LIVED_TOKEN"
   ```
7. Get your **Threads user ID**:
   ```bash
   curl "https://graph.threads.net/v1.0/me?fields=id,username&access_token=YOUR_LONG_LIVED_TOKEN"
   ```

⚠️ **Long-lived tokens expire after 60 days.** Every ~50 days, refresh it and update the GitHub secret (Settings → Secrets → update `THREADS_ACCESS_TOKEN`):
```bash
curl -G "https://graph.threads.net/refresh_access_token" \
  -d "grant_type=th_refresh_token" \
  -d "access_token=YOUR_CURRENT_LONG_LIVED_TOKEN"
```
Set yourself a recurring calendar reminder for this — it's the one manual step this automation can't do for itself without a second, longer-lived credential.

---

## 2. Set up the GitHub repo

1. Create a new repo and push these files to it.
2. Go to **Settings → Secrets and variables → Actions** and add:
   - `THREADS_ACCESS_TOKEN` — the long-lived token from step 1.6
   - `THREADS_USER_ID` — the ID from step 1.7
3. Go to **Settings → Actions → General → Workflow permissions** and select **"Read and write permissions"** (needed so the workflow can commit `posted: true` back to `posts.json`).
4. (Optional dashboard) Go to **Settings → Pages**, set source to **Deploy from a branch**, branch `main`, folder `/ (root)`. Your dashboard will appear at `https://YOUR_USERNAME.github.io/YOUR_REPO/`.

## 3. Add your content

Edit `posts.json` and add as many entries as you like:
```json
{
  "id": "004",
  "text": "Your post text here",
  "posted": false,
  "postedAt": null,
  "threadId": null
}
```
Commit and push — the next scheduled run will pick up new items automatically, oldest unposted first.

## 4. Test it

Go to the **Actions** tab → **Post to Threads** → **Run workflow** to trigger it manually and confirm everything's wired up correctly before waiting for the first scheduled run.

---

### Notes
- GitHub's cron scheduler can run a few minutes late during high load — treat "every 4 hours" as approximate, not to-the-second.
- This posts plain text only. Image/video posts use the same container flow with `media_type=IMAGE` or `VIDEO` plus a publicly hosted media URL — ask if you want that added.
- Rate limits: Threads allows up to 250 calls/user/hour and 500 posts/24h, so posting every 4 hours is well within range.
