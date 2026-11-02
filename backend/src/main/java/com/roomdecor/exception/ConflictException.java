package com.roomdecor.exception;

/** The request is valid but clashes with existing data (HTTP 409). */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
