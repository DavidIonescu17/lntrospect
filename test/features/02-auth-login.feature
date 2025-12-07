Feature: User authentication (FR-02)

Scenario: User logs in with valid credentials
  Given the user is on the login screen
  When the user enters a valid email and password
  Then the user should be taken to the main dashboard
