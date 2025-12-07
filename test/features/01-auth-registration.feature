Feature: User registration (FR-01)

Scenario: User registers a new account
  Given the user is on the registration screen
  When the user submits valid registration data with role "Client"
  Then the account should be created and the user should be redirected to onboarding
