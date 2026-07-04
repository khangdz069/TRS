package com.trs.backend.service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.trs.backend.dto.ModelRecommendationRequest;
import com.trs.backend.dto.ModelRecommendationResponse;

@Service
public class ModelRecommendationClient {
    private static final Logger logger = LoggerFactory.getLogger(ModelRecommendationClient.class);

    private final RestTemplate restTemplate;
    private final String modelUrl;

    public ModelRecommendationClient(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${trs.model.url}") String modelUrl) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(2))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
        this.modelUrl = modelUrl;
    }

    public Optional<ModelRecommendationResponse> recommend(
            String assignmentId,
            String studentMssv,
            List<Integer> failedTestcases,
            int limit) {
        try {
            ModelRecommendationRequest request = new ModelRecommendationRequest(
                    assignmentId,
                    studentMssv,
                    failedTestcases,
                    limit
            );
            ResponseEntity<ModelRecommendationResponse> response = restTemplate.postForEntity(
                    modelUrl,
                    request,
                    ModelRecommendationResponse.class
            );
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return Optional.of(response.getBody());
            }
            logger.warn("Model service returned status {}", response.getStatusCode());
        } catch (Exception ex) {
            logger.warn("Model service unavailable, using Java fallback: {}", ex.getMessage());
        }
        return Optional.empty();
    }
}
