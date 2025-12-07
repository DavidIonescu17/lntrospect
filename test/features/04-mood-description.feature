Feature: Mood description (FR-13)

Scenario: User adds description to mood entry
  Given the user has selected today's mood
  When the user adds the description "Feeling productive"
  Then the mood entry should contain the added description
