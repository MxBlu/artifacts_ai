# Train woodcutting on ash trees
# Ash trees at (2, -1)

set tree_x = 2
set tree_y = -1
set bank_x = 4
set bank_y = 1

goto {{bank_x}} {{bank_y}}
bank deposit allitems
wait_cooldown

goto {{tree_x}} {{tree_y}}

loop until woodcutting_level >= 5:
  woodcut
  wait_cooldown
  
  if inventory_full:
    goto {{bank_x}} {{bank_y}}
    bank deposit allitems
    wait_cooldown
    goto {{tree_x}} {{tree_y}}

log "Woodcutting level 5 achieved!"
