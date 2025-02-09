<?php
/*
 * Copyright 2025 Periklis Koutsogiannis
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Original Project: AiChat
 * Author: Periklis Koutsogiannis
 */

// Base session handler with provider/model namespacing
abstract class Session {
    public $sid; // Unique session ID from provider and model

    public function __construct($providerId, $modelId) {
        $this->sid = $providerId . ":" . $modelId; // Namespace isolation 
    }

    abstract function get($key);
    abstract function set($key, $value);
    abstract function clear($key);
}

// PHP native $_SESSION implementation 
class NativeSession extends Session {
    public function get($key) {
        return $_SESSION[$this->sid][$key];
    }

    public function set($key, $value) {
        $_SESSION[$this->sid][$key] = $value;
    }

    public function clear($key = null) {
        if (is_null($key)) {
            unset($_SESSION[$this->sid]);
        } else {
            unset($_SESSION[$this->sid][$key]);
        }
    }
}

// Memcache implementation for distributed systems
class MemCacheSession extends Session {
    private $mco;
    private $ttl;

    public function __construct($providerId, $modelId) {
        $this->ttl = CONFIG["session"]["ttl"] ?? 604800; // 7 days
        $this->sid = session_id() . ":" . $providerId . ":" . $modelId; // Namespace isolation 
        if (!$this->mco = memcache_connect('localhost', 11211)) {
            throw new Exception("Memcache connection failed");
        }
    }

    public function get($key) {
        $data = memcache_get($this->mco, $this->sid) ?: [];
        return $data[$key] ?? null;
    }

    public function set($key, $value) {
        $data = memcache_get($this->mco, $this->sid) ?: [];
        $data[$key] = $value;
        return memcache_set($this->mco, $this->sid, $data, 0, $this->ttl);
    }

    public function clear($key = null) {
        if (is_null($key)) {
            memcache_delete($this->mco, $this->sid);
        } else {
            $data = memcache_delete($this->mco, $key);
            unset($data[$key]);
            $this->set($key, $data);
        }
    }
}
