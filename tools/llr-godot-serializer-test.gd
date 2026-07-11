extends Node


func _ready() -> void:
	var serializer := Serializer.new()
	var signed_cases := [-8388608, -4096, -7, -1, 0, 1, 7, 4096, 8388607]
	for value in signed_cases:
		var encoded := serializer.encode_sint_bytes(value, 3)
		var decoded := serializer.decode_sint_bytes(encoded)
		if decoded != value or serializer.logged_errors.size() > 0:
			push_error("Signed integer round-trip failed: %s -> %s -> %s" % [value, encoded, decoded])
			get_tree().quit(1)
			return

	var vector_cases := [
		Vector2(-8388608, 8388607),
		Vector2(-4096, 2048),
		Vector2(-7, -7),
		Vector2(-1, 1),
		Vector2.ZERO,
		Vector2(7, -7),
	]
	for value in vector_cases:
		var encoded := serializer.encode_vector2_bytes(value, 6)
		var decoded := serializer.decode_vector2_bytes(encoded)
		if decoded != value or serializer.logged_errors.size() > 0:
			push_error("Vector2 round-trip failed: %s -> %s -> %s" % [value, encoded, decoded])
			get_tree().quit(1)
			return

	print("LLR serializer round-trip OK: %d signed integers, %d vectors" % [signed_cases.size(), vector_cases.size()])
	get_tree().quit(0)
