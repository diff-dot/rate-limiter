local currentUsage = tonumber(redis.call('get', KEYS[1]))
if currentUsage == nil then
  currentUsage = 0
end;

local usage = tonumber(ARGV[1])
local period = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

if currentUsage + usage > limit then
  return {true, currentUsage}
else
  local newUsage = redis.call('incrby', KEYS[1], usage)
  redis.call('expire', KEYS[1], period)
  return {false, newUsage}
end;