package com.pghpizza.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pghpizza.api.auth.PasswordResetTokenRepository;
import com.pghpizza.api.email.EmailService;
import com.pghpizza.api.user.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ApiFlowSecurityTests {
    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordResetTokenRepository tokenRepository;

    @MockitoBean
    EmailService emailService;

    @Test
    void publicRatingsEndpointAllowsAnonymousUsers() throws Exception {
        mockMvc.perform(get("/api/ratings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void contributorApplicationsAllowProductionCorsOrigin() throws Exception {
        mockMvc.perform(options("/api/applications")
                .header("Origin", "https://pghpizza.org")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://pghpizza.org"));
    }

    @Test
    void pendingContributorCannotPublishUntilAdminApproves() throws Exception {
        submitApplication("pending@example.com", "Pending Person", "PendingPassword123!");
        String pendingToken = login("pending@example.com", "PendingPassword123!");

        mockMvc.perform(post("/api/ratings")
                .header("Authorization", "Bearer " + pendingToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "restaurantName", "Mineo's",
                        "location", "Squirrel Hill",
                        "sauce", "7.5",
                        "toppings", "8",
                        "crust", "6.5",
                        "overallRating", 8,
                        "affordabilityRating", 7,
                        "comments", "Pending users should not be able to publish"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminsSendContributorDecisionEmailsWhenApplicationsAreReviewed() throws Exception {
        submitApplication("approved@example.com", "Approved Person", "ApprovedPassword123!");
        submitApplication("denied@example.com", "Denied Person", "DeniedPassword123!");

        String adminToken = login("admin@pgh-pizza.local", "ChangeMe123!");
        String approvedId = findApplicationId(adminToken, "approved@example.com", "PENDING");
        String deniedId = findApplicationId(adminToken, "denied@example.com", "PENDING");

        mockMvc.perform(post("/api/admin/applications/{id}/approve", approvedId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/admin/applications/{id}/reject", deniedId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        verify(emailService).sendContributorApprovalEmail("approved@example.com", "Approved Person");
        verify(emailService).sendContributorRejectionEmail("denied@example.com", "Denied Person");
    }

    @Test
    void publicContributorDirectoryShowsProfileCountsWithoutPrivateEmail() throws Exception {
        submitApplication("directory@example.com", "Directory Contributor", "DirectoryPassword123!");

        String adminToken = login("admin@pgh-pizza.local", "ChangeMe123!");
        approveFirstPendingApplication(adminToken);

        String contributorToken = login("directory@example.com", "DirectoryPassword123!");

        mockMvc.perform(post("/api/ratings")
                .header("Authorization", "Bearer " + contributorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "restaurantName", "Directory Slice",
                        "location", "Strip District",
                        "sauce", "7.5",
                        "toppings", "8",
                        "crust", "6.5",
                        "overallRating", 8.5,
                        "affordabilityRating", 8,
                        "comments", "Counts toward the public directory"))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/blog-posts")
                .header("Authorization", "Bearer " + contributorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "title", "Directory blog post",
                        "slug", "directory-blog-post",
                        "location", "Strip District",
                        "body", "A public contributor directory count should include this blog post.",
                        "youtubeUrl", "",
                        "youtubeVideoId", ""))))
                .andExpect(status().isOk());

        String response = mockMvc.perform(get("/api/profiles/contributors"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode contributor = findContributorProfile(objectMapper.readTree(response), "Directory Contributor");
        assertThat(contributor.has("email")).isFalse();
        assertThat(contributor.get("ratingCount").asLong()).isEqualTo(1);
        assertThat(contributor.get("blogPostCount").asLong()).isEqualTo(1);
    }

    @Test
    void blogPostsAcceptFullYoutubeWatchUrlsAndNormalizeVideoId() throws Exception {
        String adminToken = login("admin@pgh-pizza.local", "ChangeMe123!");

        mockMvc.perform(post("/api/blog-posts")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "title", "Full YouTube URL",
                        "slug", "full-youtube-url",
                        "location", "Pittsburgh",
                        "body", "A full YouTube watch URL should save with an embeddable video ID.",
                        "youtubeUrl", "https://www.youtube.com/watch?v=Cstdq9o8TO8",
                        "youtubeVideoId", ""))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.youtubeUrl").value("https://www.youtube.com/watch?v=Cstdq9o8TO8"))
                .andExpect(jsonPath("$.youtubeVideoId").value("Cstdq9o8TO8"));

        mockMvc.perform(get("/api/blog-posts/full-youtube-url"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.youtubeVideoId").value("Cstdq9o8TO8"));
    }

    @Test
    void adminsApproveContributorsAndContributorsCanOnlyDeleteTheirOwnRatings() throws Exception {
        submitApplication("first@example.com", "First Contributor", "FirstPassword123!");
        submitApplication("second@example.com", "Second Contributor", "SecondPassword123!");

        String adminToken = login("admin@pgh-pizza.local", "ChangeMe123!");
        approveFirstPendingApplication(adminToken);
        approveFirstPendingApplication(adminToken);

        String firstToken = login("first@example.com", "FirstPassword123!");
        String secondToken = login("second@example.com", "SecondPassword123!");

        String ratingResponse = mockMvc.perform(post("/api/ratings")
                .header("Authorization", "Bearer " + firstToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "restaurantName", "Driftwood Oven",
                        "location", "Lawrenceville",
                        "sauce", "7.5",
                        "toppings", "8",
                        "crust", "6.5",
                        "overallRating", 9,
                        "affordabilityRating", 8,
                        "comments", "Great slice"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.creator").value("First Contributor"))
                .andExpect(jsonPath("$.location").value("Lawrenceville"))
                .andExpect(jsonPath("$.affordabilityRating").value(8))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String ratingId = objectMapper.readTree(ratingResponse).get("id").asText();

        mockMvc.perform(get("/api/ratings/{id}", ratingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.creator").value("First Contributor"));

        mockMvc.perform(put("/api/ratings/{id}", ratingId)
                .header("Authorization", "Bearer " + firstToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "restaurantName", "Driftwood Oven",
                        "location", "Lawrenceville",
                        "sauce", "7.5",
                        "toppings", "8",
                        "crust", "6.5",
                        "overallRating", 9.5,
                        "affordabilityRating", 7.5,
                        "comments", "Great slice, edited"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overallRating").value(9.5))
                .andExpect(jsonPath("$.affordabilityRating").value(7.5))
                .andExpect(jsonPath("$.comments").value("Great slice, edited"));

        mockMvc.perform(delete("/api/ratings/{id}", ratingId)
                .header("Authorization", "Bearer " + secondToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/ratings/{id}", ratingId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void adminsCanMonitorContributorsAndRemoveTheirContentAndAccess() throws Exception {
        submitApplication("monitor@example.com", "Monitor Contributor", "MonitorPassword123!");

        String adminToken = login("admin@pgh-pizza.local", "ChangeMe123!");
        approveFirstPendingApplication(adminToken);

        String contributorToken = login("monitor@example.com", "MonitorPassword123!");

        String ratingResponse = mockMvc.perform(post("/api/ratings")
                .header("Authorization", "Bearer " + contributorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "restaurantName", "Badamo's",
                        "location", "North Side",
                        "sauce", "7.5",
                        "toppings", "8",
                        "crust", "6.5",
                        "overallRating", 8.5,
                        "affordabilityRating", 9.25,
                        "comments", "Worth logging"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overallRating").value(8.5))
                .andExpect(jsonPath("$.affordabilityRating").value(9.25))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String blogPostResponse = mockMvc.perform(post("/api/blog-posts")
                .header("Authorization", "Bearer " + contributorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "title", "A good slice",
                        "slug", "a-good-slice",
                        "location", "North Side",
                        "body", "A contributor note about pizza.",
                        "youtubeUrl", "",
                        "youtubeVideoId", ""))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.author").value("Monitor Contributor"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String ratingId = objectMapper.readTree(ratingResponse).get("id").asText();
        String blogPostId = objectMapper.readTree(blogPostResponse).get("id").asText();

        String contributorsResponse = mockMvc.perform(get("/api/admin/contributors")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("monitor@example.com"))
                .andExpect(jsonPath("$[0].ratingCount").value(1))
                .andExpect(jsonPath("$[0].blogPostCount").value(1))
                .andExpect(jsonPath("$[0].ratings[0].restaurantName").value("Badamo's"))
                .andExpect(jsonPath("$[0].ratings[0].location").value("North Side"))
                .andExpect(jsonPath("$[0].ratings[0].overallRating").value(8.5))
                .andExpect(jsonPath("$[0].ratings[0].affordabilityRating").value(9.25))
                .andExpect(jsonPath("$[0].blogPosts[0].title").value("A good slice"))
                .andExpect(jsonPath("$[0].blogPosts[0].location").value("North Side"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String contributorId = objectMapper.readTree(contributorsResponse).get(0).get("id").asText();

        mockMvc.perform(delete("/api/ratings/{id}", ratingId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/blog-posts/{id}", blogPostId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/admin/contributors")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ratingCount").value(0))
                .andExpect(jsonPath("$[0].blogPostCount").value(0));

        mockMvc.perform(delete("/api/admin/contributors/{id}", contributorId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", "monitor@example.com", "password", "MonitorPassword123!"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void publicProfilesShowReviewerRatingsAndBlogPostsAndUsersCanUpdateTheirProfile() throws Exception {
        String profilePictureDataUrl = "data:image/png;base64,iVBORw0KGgo=";
        submitApplication("profile@example.com", "Profile Contributor", "ProfilePassword123!");

        String adminToken = login("admin@pgh-pizza.local", "ChangeMe123!");
        approveFirstPendingApplication(adminToken);

        String contributorToken = login("profile@example.com", "ProfilePassword123!");

        String ratingResponse = mockMvc.perform(post("/api/ratings")
                .header("Authorization", "Bearer " + contributorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "restaurantName", "Slice Island",
                        "location", "Bloomfield",
                        "sauce", "7.5",
                        "toppings", "8",
                        "crust", "6.5",
                        "overallRating", 8.25,
                        "affordabilityRating", 9,
                        "comments", "A profile-worthy slice"))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        mockMvc.perform(post("/api/blog-posts")
                .header("Authorization", "Bearer " + contributorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "title", "Profile pizza notes",
                        "slug", "profile-pizza-notes",
                        "location", "Bloomfield",
                        "body", "A blog post that should appear on the reviewer profile.",
                        "youtubeUrl", "",
                        "youtubeVideoId", ""))))
                .andExpect(status().isOk());

        String profileId = objectMapper.readTree(ratingResponse).get("creatorId").asText();

        mockMvc.perform(get("/api/profiles/{id}", profileId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Profile Contributor"))
                .andExpect(jsonPath("$.bio").value(""))
                .andExpect(jsonPath("$.ratings[0].restaurantName").value("Slice Island"))
                .andExpect(jsonPath("$.ratings[0].location").value("Bloomfield"))
                .andExpect(jsonPath("$.blogPosts[0].title").value("Profile pizza notes"))
                .andExpect(jsonPath("$.blogPosts[0].location").value("Bloomfield"));

        mockMvc.perform(put("/api/profiles/me")
                .header("Authorization", "Bearer " + contributorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "displayName", "Profile Pizza Pro",
                        "bio", "Trying every slice in Pittsburgh.",
                        "profilePictureUrl", profilePictureDataUrl))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Profile Pizza Pro"))
                .andExpect(jsonPath("$.bio").value("Trying every slice in Pittsburgh."))
                .andExpect(jsonPath("$.profilePictureUrl").value(profilePictureDataUrl));

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + contributorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Profile Pizza Pro"))
                .andExpect(jsonPath("$.profileBio").value("Trying every slice in Pittsburgh."))
                .andExpect(jsonPath("$.profilePictureUrl").value(profilePictureDataUrl));
    }

    @Test
    void adminsCanManageUserPermissionsAndAdminChecksUseCurrentDatabaseRole() throws Exception {
        submitApplication("permissions@example.com", "Permissions User", "PermissionsPassword123!");

        String adminToken = login("admin@pgh-pizza.local", "ChangeMe123!");
        approveFirstPendingApplication(adminToken);

        String contributorToken = login("permissions@example.com", "PermissionsPassword123!");

        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + contributorToken))
                .andExpect(status().isForbidden());

        String usersResponse = mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode users = objectMapper.readTree(usersResponse);
        String userId = findUserByEmail(users, "permissions@example.com").get("id").asText();
        String adminId = findUserByEmail(users, "admin@pgh-pizza.local").get("id").asText();

        mockMvc.perform(put("/api/admin/users/{id}/role", adminId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("role", "CONTRIBUTOR"))))
                .andExpect(status().isConflict());

        mockMvc.perform(put("/api/admin/users/{id}/role", userId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("role", "ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + contributorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));

        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + contributorToken))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/users/{id}/role", adminId)
                .header("Authorization", "Bearer " + contributorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("role", "CONTRIBUTOR"))))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));

        mockMvc.perform(put("/api/admin/users/{id}/role", userId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("role", "CONTRIBUTOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CONTRIBUTOR"));

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + contributorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CONTRIBUTOR"));

        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + contributorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void passwordsAndResetTokensAreStoredOnlyAsHashes() throws Exception {
        String rawPassword = "HashMePlease123!";
        submitApplication("hashes@example.com", "Hash Tester", rawPassword);

        var user = userRepository.findByEmail("hashes@example.com").orElseThrow();
        assertThat(user.getPasswordHash()).isNotEqualTo(rawPassword);
        assertThat(user.getPasswordHash()).startsWith("$2");

        mockMvc.perform(post("/api/auth/password-reset/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", "hashes@example.com"))))
                .andExpect(status().isAccepted());

        var token = tokenRepository.findAll().getFirst();
        assertThat(token.getTokenHash()).hasSize(64);
        assertThat(token.getTokenHash()).doesNotContain("hashes@example.com");
    }

    @Test
    void sqlInjectionLookingInputIsStoredAsTextAndDoesNotChangeQueryBehavior() throws Exception {
        String adminToken = login("admin@pgh-pizza.local", "ChangeMe123!");
        String maliciousText = "'); DROP TABLE users; --";

        mockMvc.perform(post("/api/ratings")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "restaurantName", maliciousText,
                        "location", maliciousText,
                        "sauce", "7.5",
                        "toppings", "8",
                        "crust", "6.5",
                        "overallRating", 7,
                        "affordabilityRating", 6,
                        "comments", maliciousText))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.restaurantName").value(maliciousText))
                .andExpect(jsonPath("$.location").value(maliciousText))
                .andExpect(jsonPath("$.comments").value(maliciousText));

        assertThat(userRepository.findByEmail("admin@pgh-pizza.local")).isPresent();
        mockMvc.perform(get("/api/ratings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].restaurantName").value(maliciousText))
                .andExpect(jsonPath("$[0].location").value(maliciousText));
    }

    private void submitApplication(String email, String displayName, String password) throws Exception {
        mockMvc.perform(post("/api/applications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "email", email,
                        "displayName", displayName,
                        "password", password,
                        "applicationReason", "I want to help review Pittsburgh pizza spots."))))
                .andExpect(status().isOk());
    }

    private String login(String email, String password) throws Exception {
        String response = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", email, "password", password))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).get("token").asText();
    }

    private void approveFirstPendingApplication(String adminToken) throws Exception {
        String response = mockMvc.perform(get("/api/admin/applications")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode applications = objectMapper.readTree(response);
        String pendingId = null;
        for (JsonNode application : applications) {
            if ("PENDING".equals(application.get("status").asText())) {
                pendingId = application.get("id").asText();
                break;
            }
        }

        assertThat(pendingId).isNotNull();
        mockMvc.perform(post("/api/admin/applications/{id}/approve", pendingId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    private String findApplicationId(String adminToken, String email, String expectedStatus) throws Exception {
        String response = mockMvc.perform(get("/api/admin/applications")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode applications = objectMapper.readTree(response);
        for (JsonNode application : applications) {
            if (email.equals(application.get("email").asText())
                    && expectedStatus.equals(application.get("status").asText())) {
                return application.get("id").asText();
            }
        }

        throw new AssertionError("Application not found: " + email);
    }

    private JsonNode findUserByEmail(JsonNode users, String email) {
        for (JsonNode user : users) {
            if (email.equals(user.get("email").asText())) {
                return user;
            }
        }

        throw new AssertionError("User not found: " + email);
    }

    private JsonNode findContributorProfile(JsonNode contributors, String displayName) {
        for (JsonNode contributor : contributors) {
            if (displayName.equals(contributor.get("displayName").asText())) {
                return contributor;
            }
        }

        throw new AssertionError("Contributor profile not found: " + displayName);
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }
}
