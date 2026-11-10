import { profilePictureUrl, withProfilePicture } from "./profile-picture";

// M27 step 6 (decision Q8c): user responses name the avatar by its URL
describe("profile picture URL", () => {
  const updated_at = new Date("2026-11-10T08:00:00Z");

  it("is the avatar route with the change time as version", () => {
    expect(profilePictureUrl(5, { updated_at })).toBe(
      `/users/5/avatar?v=${updated_at.getTime()}`,
    );
  });

  it("is null without an avatar", () => {
    expect(profilePictureUrl(5, null)).toBeNull();
    expect(profilePictureUrl(5, undefined)).toBeNull();
  });

  it("replaces the avatar relation of a user row", () => {
    expect(
      withProfilePicture({
        user_id: 5,
        firstname: "Felix",
        user_avatars: { updated_at },
      }),
    ).toEqual({
      user_id: 5,
      firstname: "Felix",
      profile_picture: `/users/5/avatar?v=${updated_at.getTime()}`,
    });
    expect(
      withProfilePicture({ user_id: 6, firstname: "Anna", user_avatars: null }),
    ).toEqual({ user_id: 6, firstname: "Anna", profile_picture: null });
  });
});
