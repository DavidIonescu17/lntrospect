Feature: Mood history visualization (FR-14)

Scenario: User views mood trends
  Given the user has past mood records
  When the user opens the insights screen
  Then a trend graph with 7/30/90 day ranges should be visible
