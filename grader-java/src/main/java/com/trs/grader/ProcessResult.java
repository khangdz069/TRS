package com.trs.grader;

record ProcessResult(
        int exitCode,
        String stdout,
        String stderr,
        boolean timedOut
) {
}
