from __future__ import annotations
import os
from app.settings import Settings


def test_cors_parsing_json_array(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", '["http://a.com","http://b.com"]')
    s = Settings()
    assert s.CORS_ORIGINS == ["http://a.com", "http://b.com"]


def test_cors_parsing_comma_separated(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", 'http://a.com, http://b.com')
    s = Settings()
    assert s.CORS_ORIGINS == ["http://a.com", "http://b.com"]


def test_cors_parsing_empty_string(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", '')
    s = Settings()
    assert s.CORS_ORIGINS == []


def test_require_auth_default_false(monkeypatch):
    monkeypatch.delenv("REQUIRE_AUTH", raising=False)
    s = Settings()
    assert s.REQUIRE_AUTH is False


def test_require_auth_true(monkeypatch):
    monkeypatch.setenv("REQUIRE_AUTH", "1")
    s = Settings()
    assert s.REQUIRE_AUTH is True
