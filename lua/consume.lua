local currentUsage = tonumber(redis.call('get', KEYS[1]))
local isNewKey = false
if currentUsage == nil then
  currentUsage = 0
  isNewKey = true
end;

local usage = tonumber(ARGV[1])
local period = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])


if currentUsage + usage > limit then
  return {true, currentUsage}
else
  local newUsage = redis.call('incrby', KEYS[1], usage)
  if isNewKey == true then
    redis.call('expire', KEYS[1], ttl)
  end;
  return {false, newUsage}
end;