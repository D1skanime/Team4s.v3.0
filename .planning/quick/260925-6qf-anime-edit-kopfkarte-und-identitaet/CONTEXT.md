# Context

The Anime edit page currently presents the edit header and the four-step navigator as two separate cards. The identity section also lost its information-tile styles after a stylesheet import mismatch, causing labels and values to run together.

Decision: keep the existing header content, linked cover, source/Jellyfin identifiers, and step labels, but render the edit header and stepper inside one shared card. Restore the existing compact information-tile pattern for the identity fields without changing API or persisted data.
