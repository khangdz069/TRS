package com.trs.backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

public final class TestcaseCatalog {
    public static final List<Integer> TESTCASE_IDS = buildIds();

    private TestcaseCatalog() {
    }

    private static List<Integer> buildIds() {
        List<Integer> ids = new ArrayList<>();
        addRange(ids, 1001, 1011);
        addRange(ids, 1011, 1017);
        addRange(ids, 1021, 1031);
        addRange(ids, 1047, 1061);
        addRange(ids, 1075, 1093);
        addRange(ids, 1111, 1119);
        addRange(ids, 1125, 1131);
        addRange(ids, 1141, 1151);
        addRange(ids, 1155, 1161);
        addRange(ids, 1171, 1176);
        addRange(ids, 1181, 1189);
        addRange(ids, 1201, 1209);
        return List.copyOf(ids);
    }

    private static void addRange(List<Integer> ids, int startInclusive, int endExclusive) {
        IntStream.range(startInclusive, endExclusive).forEach(ids::add);
    }
}
