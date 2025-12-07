Feature: Emergency hotline listing (FR-22)

Scenario: View local emergency numbers
  Given the user's region is Romania
  When the user opens crisis resources
  Then emergency hotline numbers for Romania should be shown
