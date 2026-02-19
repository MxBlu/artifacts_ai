# Simple combat loop - fight chickens to level up
# Chickens are at (0, 1) on the overworld

set bank_x = 4
set bank_y = 1
set chicken_x = 0
set chicken_y = 1

# Deposit everything first
goto {{bank_x}} {{bank_y}}
bank deposit allitems
wait_cooldown

# Go fight chickens
goto {{chicken_x}} {{chicken_y}}

loop 20:
  fight
  wait_cooldown
  
  if hp_percent < 30:
    goto {{bank_x}} {{bank_y}}
    rest
    goto {{chicken_x}} {{chicken_y}}

log "Combat loop complete!"
