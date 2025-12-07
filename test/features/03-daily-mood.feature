Feature: Daily Emotional Thermometer (FR-12)

Scenario: User submits daily mood score
  Given the user is logged in
  When the user selects a mood value from 1 to 10
  Then today's mood score should be saved
