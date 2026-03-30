import { expect, test } from "@playwright/test";

test("admin invite form displays generated invite link", async ({ page }) => {
  await page.route("**/api/v1/members/invite", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          invite: {
            id: "invite-1",
            email: "newmember@example.com",
            role: "MEMBER",
          },
          inviteToken: "test-token",
          inviteLink: "http://127.0.0.1:3000/invite/accept?token=test-token",
          auditLogged: true,
          auditError: null,
          note: "Token is only returned once. Store or send immediately.",
        },
        meta: null,
        error: null,
      }),
    });
  });

  await page.goto("/admin/invites");

  await page.getByLabel("Email").fill("newmember@example.com");
  await page.getByRole("button", { name: "Invite" }).click();

  await expect(page.getByText("One-time Invite Link")).toBeVisible();
  await expect(page.getByText("/invite/accept?token=test-token")).toBeVisible();
});

test("invite acceptance redirects to login with prefilled email", async ({
  page,
}) => {
  await page.route("**/api/v1/members/invite/verify?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          state: "active",
          invite: {
            id: "invite-1",
            role: "MEMBER",
            emailMasked: "ne***@example.com",
          },
        },
        meta: null,
        error: null,
      }),
    });
  });

  await page.route("**/api/v1/members/invite/accept", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          accepted: true,
          email: "newmember@example.com",
          role: "MEMBER",
          auditLogged: true,
          auditError: null,
          profileSyncError: null,
        },
        meta: null,
        error: null,
      }),
    });
  });

  await page.goto("/invite/accept?token=test-token");

  await page.getByLabel("Full name").fill("New Member");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await page.waitForURL("**/login?email=newmember%40example.com", {
    timeout: 8_000,
  });

  await expect(page.getByLabel("Email")).toHaveValue("newmember@example.com");
});
