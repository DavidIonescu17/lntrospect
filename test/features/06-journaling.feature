Feature: Journaling (FR-16)

Scenario: Journal CRUD operations
  Given the user is logged in
  When the user creates a journal entry titled "Test entry"
  Then the entry is saved with a timestamp

  When the user updates the entry title to "Updated test entry"
  Then the entry content should change accordingly

  When the user deletes the entry
  Then the entry should no longer be visible in the journal list
